use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub path: String,
    pub name: String,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchMatch {
    pub line: usize,
    pub content: String,
    pub highlight: Vec<(usize, usize)>,
}

/// Search for text in all vault files
#[tauri::command]
pub async fn search_files(
    vault_path: String,
    query: String,
) -> Result<Vec<SearchResult>, String> {
    let path = Path::new(&vault_path);
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map_or(false, |ext| ext == "md")
                && !e.path().to_string_lossy().contains(".obsidian")
        })
    {
        let file_path = entry.path();
        
        // Check filename match
        let name = file_path
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        
        let name_matches = name.to_lowercase().contains(&query_lower);

        // Check content match
        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let mut matches = Vec::new();
        
        for (line_num, line) in content.lines().enumerate() {
            let line_lower = line.to_lowercase();
            if line_lower.contains(&query_lower) {
                // Find all occurrences in the line
                let mut highlights = Vec::new();
                let mut start = 0;
                
                while let Some(pos) = line_lower[start..].find(&query_lower) {
                    let abs_pos = start + pos;
                    highlights.push((abs_pos, abs_pos + query.len()));
                    start = abs_pos + 1;
                }

                matches.push(SearchMatch {
                    line: line_num + 1,
                    content: line.to_string(),
                    highlight: highlights,
                });
            }
        }

        if name_matches || !matches.is_empty() {
            results.push(SearchResult {
                path: file_path.to_string_lossy().to_string(),
                name,
                matches,
            });
        }
    }

    // Sort by relevance (filename matches first, then by number of content matches)
    results.sort_by(|a, b| {
        let a_name_match = a.name.to_lowercase().contains(&query_lower);
        let b_name_match = b.name.to_lowercase().contains(&query_lower);
        
        match (a_name_match, b_name_match) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => b.matches.len().cmp(&a.matches.len()),
        }
    });

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::tempdir;

    fn create_test_file(dir: &std::path::Path, name: &str, content: &str) -> std::path::PathBuf {
        let file_path = dir.join(name);
        let mut file = File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file_path
    }

    #[tokio::test]
    async fn test_search_by_filename() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "important-task.md", "# Random content");
        create_test_file(dir.path(), "other-note.md", "# Other content");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "important".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "important-task");
    }

    #[tokio::test]
    async fn test_search_by_content() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "note1.md", "# Note\n\nThis contains searchterm here");
        create_test_file(dir.path(), "note2.md", "# Note\n\nNo matching content");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "searchterm".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "note1");
        assert!(!results[0].matches.is_empty());
    }

    #[tokio::test]
    async fn test_search_case_insensitive() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "note.md", "# UPPERCASE content");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "uppercase".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_search_multiple_matches_in_line() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "note.md", "# test test test");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "test".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
        let match_result = &results[0].matches[0];
        assert_eq!(match_result.highlight.len(), 3); // 3 occurrences
    }

    #[tokio::test]
    async fn test_search_highlights_positions() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "note.md", "find the keyword here");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "keyword".to_string(),
        )
        .await
        .unwrap();

        let match_result = &results[0].matches[0];
        let (start, end) = match_result.highlight[0];
        assert_eq!(start, 9); // "find the " = 9 characters
        assert_eq!(end, 16);  // "keyword" = 7 characters
    }

    #[tokio::test]
    async fn test_search_returns_line_numbers() {
        let dir = tempdir().unwrap();
        create_test_file(
            dir.path(),
            "note.md",
            "line 1\nline 2\nmatch here\nline 4",
        );

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "match".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results[0].matches[0].line, 3);
    }

    #[tokio::test]
    async fn test_search_prioritizes_name_matches() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "searchterm.md", "# No match in content");
        create_test_file(
            dir.path(),
            "other.md",
            "# Contains searchterm in body multiple times searchterm",
        );

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "searchterm".to_string(),
        )
        .await
        .unwrap();

        // File with name match should come first
        assert_eq!(results[0].name, "searchterm");
    }

    #[tokio::test]
    async fn test_search_no_results() {
        let dir = tempdir().unwrap();
        create_test_file(dir.path(), "note.md", "# Some content");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "nonexistent".to_string(),
        )
        .await
        .unwrap();

        assert!(results.is_empty());
    }

    #[tokio::test]
    async fn test_search_ignores_obsidian_folder() {
        let dir = tempdir().unwrap();
        let obsidian = dir.path().join(".obsidian");
        fs::create_dir_all(&obsidian).unwrap();

        create_test_file(&obsidian, "config.md", "# searchterm");
        create_test_file(dir.path(), "note.md", "# searchterm");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "searchterm".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "note");
    }

    #[tokio::test]
    async fn test_search_nested_directories() {
        let dir = tempdir().unwrap();
        let nested = dir.path().join("folder").join("subfolder");
        fs::create_dir_all(&nested).unwrap();

        create_test_file(&nested, "deep-note.md", "# searchterm");

        let results = search_files(
            dir.path().to_string_lossy().to_string(),
            "searchterm".to_string(),
        )
        .await
        .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "deep-note");
    }
}
