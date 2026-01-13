use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VaultFile {
    pub path: String,
    pub name: String,
    pub content: String,
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub folder: String,
    pub created_at: String,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub is_directory: bool,
}

/// Read all markdown files from a vault directory
#[tauri::command]
pub async fn read_vault(vault_path: String) -> Result<Vec<VaultFile>, String> {
    let path = Path::new(&vault_path);
    
    if !path.exists() {
        return Err(format!("Vault path does not exist: {}", vault_path));
    }

    let mut files = Vec::new();

    for entry in WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path().extension().map_or(false, |ext| ext == "md")
                && !e.path().to_string_lossy().contains(".obsidian")
        })
    {
        if let Ok(file) = read_single_file(entry.path()) {
            files.push(file);
        }
    }

    Ok(files)
}

/// Read a single markdown file
#[tauri::command]
pub async fn read_file(file_path: String) -> Result<VaultFile, String> {
    let path = Path::new(&file_path);
    read_single_file(path)
}

fn read_single_file(path: &Path) -> Result<VaultFile, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;

    let (frontmatter, body) = parse_frontmatter(&content);

    let name = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();

    let folder = path
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let created_at = metadata
        .created()
        .map(|t| chrono::DateTime::<chrono::Utc>::from(t).format("%Y-%m-%d").to_string())
        .unwrap_or_default();

    let modified_at = metadata
        .modified()
        .map(|t| chrono::DateTime::<chrono::Utc>::from(t).format("%Y-%m-%d").to_string())
        .unwrap_or_default();

    Ok(VaultFile {
        path: path.to_string_lossy().to_string(),
        name,
        content: body,
        frontmatter,
        folder,
        created_at,
        modified_at,
    })
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(
    file_path: String,
    content: String,
    frontmatter: HashMap<String, serde_json::Value>,
) -> Result<(), String> {
    let yaml = if frontmatter.is_empty() {
        String::new()
    } else {
        let yaml_str = serde_yaml::to_string(&frontmatter)
            .map_err(|e| format!("Failed to serialize frontmatter: {}", e))?;
        format!("---\n{}---\n\n", yaml_str)
    };

    let full_content = format!("{}{}", yaml, content);

    fs::write(&file_path, full_content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Create a new file
#[tauri::command]
pub async fn create_file(
    folder: String,
    name: String,
    content: String,
    frontmatter: HashMap<String, serde_json::Value>,
) -> Result<VaultFile, String> {
    let file_path = PathBuf::from(&folder).join(format!("{}.md", name));
    
    if file_path.exists() {
        return Err("File already exists".to_string());
    }

    // Ensure directory exists
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    write_file(
        file_path.to_string_lossy().to_string(),
        content,
        frontmatter.clone(),
    )
    .await?;

    read_file(file_path.to_string_lossy().to_string()).await
}

/// Delete a file
#[tauri::command]
pub async fn delete_file(file_path: String) -> Result<(), String> {
    fs::remove_file(&file_path)
        .map_err(|e| format!("Failed to delete file: {}", e))?;
    Ok(())
}

/// Move a file to a new location
#[tauri::command]
pub async fn move_file(
    old_path: String,
    new_folder: String,
) -> Result<VaultFile, String> {
    let old = Path::new(&old_path);
    let file_name = old
        .file_name()
        .ok_or("Invalid file path")?;
    
    let new_path = PathBuf::from(&new_folder).join(file_name);

    // Ensure target directory exists
    fs::create_dir_all(&new_folder)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    fs::rename(&old_path, &new_path)
        .map_err(|e| format!("Failed to move file: {}", e))?;

    read_file(new_path.to_string_lossy().to_string()).await
}

/// List files in a directory
#[tauri::command]
pub async fn list_files(dir_path: String) -> Result<Vec<FileInfo>, String> {
    let path = Path::new(&dir_path);
    
    if !path.exists() {
        return Err(format!("Directory does not exist: {}", dir_path));
    }

    let mut files = Vec::new();

    for entry in fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        
        // Skip hidden files and .obsidian
        if path.file_name()
            .map(|n| n.to_string_lossy().starts_with('.'))
            .unwrap_or(false)
        {
            continue;
        }

        files.push(FileInfo {
            path: path.to_string_lossy().to_string(),
            name: path
                .file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default(),
            is_directory: path.is_dir(),
        });
    }

    Ok(files)
}

/// Parse YAML frontmatter from markdown content
fn parse_frontmatter(content: &str) -> (HashMap<String, serde_json::Value>, String) {
    let content = content.trim();
    
    if !content.starts_with("---") {
        return (HashMap::new(), content.to_string());
    }

    let parts: Vec<&str> = content.splitn(3, "---").collect();
    
    if parts.len() < 3 {
        return (HashMap::new(), content.to_string());
    }

    let yaml_str = parts[1].trim();
    let body = parts[2].trim().to_string();

    let frontmatter: HashMap<String, serde_json::Value> = serde_yaml::from_str(yaml_str)
        .unwrap_or_default();

    (frontmatter, body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::tempdir;

    // Helper to create a test markdown file
    fn create_test_file(dir: &std::path::Path, name: &str, content: &str) -> std::path::PathBuf {
        let file_path = dir.join(name);
        let mut file = File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file_path
    }

    mod parse_frontmatter_tests {
        use super::*;

        #[test]
        fn test_parse_valid_frontmatter() {
            let content = r#"---
status: active
priority: high
area: work
---

# My Note

Content here."#;

            let (frontmatter, body) = parse_frontmatter(content);

            assert_eq!(frontmatter.get("status").unwrap(), "active");
            assert_eq!(frontmatter.get("priority").unwrap(), "high");
            assert_eq!(frontmatter.get("area").unwrap(), "work");
            assert!(body.contains("# My Note"));
            assert!(body.contains("Content here."));
        }

        #[test]
        fn test_parse_no_frontmatter() {
            let content = "# Just a heading\n\nNo frontmatter here.";

            let (frontmatter, body) = parse_frontmatter(content);

            assert!(frontmatter.is_empty());
            assert_eq!(body, content);
        }

        #[test]
        fn test_parse_empty_content() {
            let content = "";

            let (frontmatter, body) = parse_frontmatter(content);

            assert!(frontmatter.is_empty());
            assert_eq!(body, "");
        }

        #[test]
        fn test_parse_incomplete_frontmatter() {
            // Note: The implementation splits by "---" so if there are 3+ parts
            // it will parse whatever is between the first two delimiters
            let content = "---\nstatus: active\n\n# Content without closing ---";

            let (frontmatter, _body) = parse_frontmatter(content);

            // Implementation parses what it can find
            assert_eq!(frontmatter.get("status").unwrap(), "active");
        }

        #[test]
        fn test_parse_frontmatter_with_arrays() {
            let content = r#"---
tags:
  - work
  - urgent
---

Content"#;

            let (frontmatter, body) = parse_frontmatter(content);

            let tags = frontmatter.get("tags").unwrap().as_array().unwrap();
            assert_eq!(tags.len(), 2);
            assert_eq!(tags[0], "work");
            assert_eq!(tags[1], "urgent");
        }

        #[test]
        fn test_parse_frontmatter_with_boolean() {
            let content = r#"---
completed: true
archived: false
---

Content"#;

            let (frontmatter, body) = parse_frontmatter(content);

            assert_eq!(frontmatter.get("completed").unwrap(), true);
            assert_eq!(frontmatter.get("archived").unwrap(), false);
        }

        #[test]
        fn test_parse_frontmatter_with_numbers() {
            let content = r#"---
priority: 1
score: 95.5
---

Content"#;

            let (frontmatter, body) = parse_frontmatter(content);

            assert_eq!(frontmatter.get("priority").unwrap(), 1);
            assert_eq!(frontmatter.get("score").unwrap(), 95.5);
        }

        #[test]
        fn test_parse_frontmatter_preserves_body_with_dashes() {
            let content = r#"---
status: active
---

# Title

---

More content after horizontal rule"#;

            let (frontmatter, body) = parse_frontmatter(content);

            assert_eq!(frontmatter.get("status").unwrap(), "active");
            assert!(body.contains("---"));
            assert!(body.contains("More content after horizontal rule"));
        }

        #[test]
        fn test_parse_frontmatter_with_url() {
            let content = r#"---
url: https://example.com/path
---

Content"#;

            let (frontmatter, body) = parse_frontmatter(content);

            assert_eq!(
                frontmatter.get("url").unwrap(),
                "https://example.com/path"
            );
        }
    }

    mod file_operations_tests {
        use super::*;

        #[tokio::test]
        async fn test_read_file_success() {
            let dir = tempdir().unwrap();
            let content = r#"---
status: next-action
---

# Test Task"#;
            let file_path = create_test_file(dir.path(), "test.md", content);

            let result = read_file(file_path.to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let file = result.unwrap();
            assert_eq!(file.name, "test");
            assert!(file.content.contains("# Test Task"));
        }

        #[tokio::test]
        async fn test_read_file_not_found() {
            let result = read_file("/nonexistent/path/file.md".to_string()).await;

            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_create_file_success() {
            let dir = tempdir().unwrap();
            let mut frontmatter = HashMap::new();
            frontmatter.insert(
                "status".to_string(),
                serde_json::Value::String("active".to_string()),
            );

            let result = create_file(
                dir.path().to_string_lossy().to_string(),
                "new-note".to_string(),
                "# New Note\n\nContent".to_string(),
                frontmatter,
            )
            .await;

            assert!(result.is_ok());
            let file = result.unwrap();
            assert_eq!(file.name, "new-note");

            // Verify file was created
            let file_path = dir.path().join("new-note.md");
            assert!(file_path.exists());
        }

        #[tokio::test]
        async fn test_create_file_already_exists() {
            let dir = tempdir().unwrap();
            create_test_file(dir.path(), "existing.md", "# Existing");

            let result = create_file(
                dir.path().to_string_lossy().to_string(),
                "existing".to_string(),
                "# New Content".to_string(),
                HashMap::new(),
            )
            .await;

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("already exists"));
        }

        #[tokio::test]
        async fn test_delete_file_success() {
            let dir = tempdir().unwrap();
            let file_path = create_test_file(dir.path(), "to-delete.md", "# Delete me");

            let result = delete_file(file_path.to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            assert!(!file_path.exists());
        }

        #[tokio::test]
        async fn test_delete_file_not_found() {
            let result = delete_file("/nonexistent/file.md".to_string()).await;

            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_move_file_success() {
            let dir = tempdir().unwrap();
            let source_dir = dir.path().join("source");
            let target_dir = dir.path().join("target");
            fs::create_dir_all(&source_dir).unwrap();
            fs::create_dir_all(&target_dir).unwrap();

            let file_path = create_test_file(&source_dir, "file.md", "# Content");

            let result = move_file(
                file_path.to_string_lossy().to_string(),
                target_dir.to_string_lossy().to_string(),
            )
            .await;

            assert!(result.is_ok());
            let moved = result.unwrap();
            assert!(moved.folder.contains("target"));

            // Verify file moved
            assert!(!file_path.exists());
            assert!(target_dir.join("file.md").exists());
        }

        #[tokio::test]
        async fn test_write_file_with_frontmatter() {
            let dir = tempdir().unwrap();
            let file_path = dir.path().join("test.md");

            let mut frontmatter = HashMap::new();
            frontmatter.insert(
                "status".to_string(),
                serde_json::Value::String("active".to_string()),
            );
            frontmatter.insert(
                "priority".to_string(),
                serde_json::Value::String("high".to_string()),
            );

            let result = write_file(
                file_path.to_string_lossy().to_string(),
                "# Test Content".to_string(),
                frontmatter,
            )
            .await;

            assert!(result.is_ok());

            // Verify file content
            let content = fs::read_to_string(&file_path).unwrap();
            assert!(content.contains("---"));
            assert!(content.contains("status:"));
            assert!(content.contains("priority:"));
            assert!(content.contains("# Test Content"));
        }

        #[tokio::test]
        async fn test_write_file_without_frontmatter() {
            let dir = tempdir().unwrap();
            let file_path = dir.path().join("test.md");

            let result = write_file(
                file_path.to_string_lossy().to_string(),
                "# Just Content".to_string(),
                HashMap::new(),
            )
            .await;

            assert!(result.is_ok());

            let content = fs::read_to_string(&file_path).unwrap();
            assert!(!content.starts_with("---"));
            assert!(content.contains("# Just Content"));
        }

        #[tokio::test]
        async fn test_list_files_success() {
            let dir = tempdir().unwrap();
            create_test_file(dir.path(), "file1.md", "# File 1");
            create_test_file(dir.path(), "file2.md", "# File 2");
            fs::create_dir(dir.path().join("subdir")).unwrap();

            let result = list_files(dir.path().to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let files = result.unwrap();
            assert_eq!(files.len(), 3); // 2 files + 1 directory
        }

        #[tokio::test]
        async fn test_list_files_ignores_hidden() {
            let dir = tempdir().unwrap();
            create_test_file(dir.path(), "visible.md", "# Visible");
            create_test_file(dir.path(), ".hidden.md", "# Hidden");

            let result = list_files(dir.path().to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let files = result.unwrap();
            assert_eq!(files.len(), 1);
            assert_eq!(files[0].name, "visible");
        }

        #[tokio::test]
        async fn test_list_files_not_found() {
            let result = list_files("/nonexistent/directory".to_string()).await;

            assert!(result.is_err());
        }
    }

    mod vault_operations_tests {
        use super::*;

        #[tokio::test]
        async fn test_read_vault_success() {
            let dir = tempdir().unwrap();

            // Create nested structure
            let inbox = dir.path().join("00 - Inbox");
            let tasks = dir.path().join("02 - Tasks").join("Next Actions");
            fs::create_dir_all(&inbox).unwrap();
            fs::create_dir_all(&tasks).unwrap();

            create_test_file(&inbox, "idea.md", "# Idea");
            create_test_file(&tasks, "task.md", "# Task");

            let result = read_vault(dir.path().to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let files = result.unwrap();
            assert_eq!(files.len(), 2);
        }

        #[tokio::test]
        async fn test_read_vault_ignores_obsidian() {
            let dir = tempdir().unwrap();
            let obsidian = dir.path().join(".obsidian");
            fs::create_dir_all(&obsidian).unwrap();

            create_test_file(dir.path(), "note.md", "# Note");
            create_test_file(&obsidian, "config.md", "# Config");

            let result = read_vault(dir.path().to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let files = result.unwrap();
            assert_eq!(files.len(), 1);
            assert_eq!(files[0].name, "note");
        }

        #[tokio::test]
        async fn test_read_vault_not_found() {
            let result = read_vault("/nonexistent/vault".to_string()).await;

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("does not exist"));
        }

        #[tokio::test]
        async fn test_read_vault_only_md_files() {
            let dir = tempdir().unwrap();
            create_test_file(dir.path(), "note.md", "# Note");
            create_test_file(dir.path(), "image.png", "binary data");
            create_test_file(dir.path(), "text.txt", "plain text");

            let result = read_vault(dir.path().to_string_lossy().to_string()).await;

            assert!(result.is_ok());
            let files = result.unwrap();
            assert_eq!(files.len(), 1);
            assert_eq!(files[0].name, "note");
        }
    }
}
