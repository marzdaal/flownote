use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateResult {
    pub frontmatter: HashMap<String, serde_json::Value>,
    pub content: String,
}

/// Apply a template to transform file frontmatter
#[tauri::command]
pub async fn apply_template(
    template_type: String,
    existing_frontmatter: HashMap<String, serde_json::Value>,
    existing_content: String,
) -> Result<TemplateResult, String> {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let mut frontmatter = existing_frontmatter.clone();

    match template_type.as_str() {
        "task" => {
            // Apply task template
            frontmatter.entry("status".to_string())
                .or_insert(serde_json::Value::String("next-action".to_string()));
            frontmatter.entry("priority".to_string())
                .or_insert(serde_json::Value::String("medium".to_string()));
            frontmatter.entry("created".to_string())
                .or_insert(serde_json::Value::String(today.clone()));
            
            // Remove non-task fields
            frontmatter.remove("outcome");
            frontmatter.remove("start");
            frontmatter.remove("end");
        }
        "project" => {
            // Apply project template
            frontmatter.entry("status".to_string())
                .or_insert(serde_json::Value::String("active".to_string()));
            frontmatter.entry("start".to_string())
                .or_insert(serde_json::Value::String(today.clone()));
            frontmatter.entry("created".to_string())
                .or_insert(serde_json::Value::String(today.clone()));
            
            // Remove non-project fields
            frontmatter.remove("due");
            frontmatter.remove("priority");
            frontmatter.remove("waiting_for");
        }
        "note" => {
            // Apply note template
            frontmatter.entry("created".to_string())
                .or_insert(serde_json::Value::String(today.clone()));
            frontmatter.entry("tags".to_string())
                .or_insert(serde_json::Value::Array(vec![]));
            
            // Remove task/project specific fields
            frontmatter.remove("status");
            frontmatter.remove("due");
            frontmatter.remove("priority");
            frontmatter.remove("waiting_for");
            frontmatter.remove("outcome");
            frontmatter.remove("start");
            frontmatter.remove("end");
        }
        "daily" => {
            // Apply daily note template
            frontmatter.insert(
                "date".to_string(),
                serde_json::Value::String(today.clone()),
            );
        }
        _ => {
            return Err(format!("Unknown template type: {}", template_type));
        }
    }

    Ok(TemplateResult {
        frontmatter,
        content: existing_content,
    })
}

/// Generate content for a new daily note
#[tauri::command]
pub fn generate_daily_note_content() -> String {
    let today = Local::now();
    let date_header = today.format("%A, %B %d, %Y").to_string();
    
    format!(
        r#"# {}

## 📥 Inbox


---

## ✅ Tasks for Today


---

## 📝 Notes


---

## 📊 End of Day

### What got done

### What didn't get done

### Thoughts
"#,
        date_header
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn today_date_string() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    mod apply_template_tests {
        use super::*;

        #[tokio::test]
        async fn test_apply_task_template() {
            let existing_frontmatter = HashMap::new();
            let existing_content = "# Task Content".to_string();

            let result = apply_template(
                "task".to_string(),
                existing_frontmatter,
                existing_content.clone(),
            )
            .await
            .unwrap();

            assert_eq!(
                result.frontmatter.get("status").unwrap(),
                "next-action"
            );
            assert_eq!(
                result.frontmatter.get("priority").unwrap(),
                "medium"
            );
            assert!(result.frontmatter.contains_key("created"));
            assert_eq!(result.content, existing_content);
        }

        #[tokio::test]
        async fn test_apply_task_template_preserves_existing() {
            let mut existing_frontmatter = HashMap::new();
            existing_frontmatter.insert(
                "area".to_string(),
                serde_json::Value::String("work".to_string()),
            );

            let result = apply_template(
                "task".to_string(),
                existing_frontmatter,
                "# Content".to_string(),
            )
            .await
            .unwrap();

            assert_eq!(result.frontmatter.get("area").unwrap(), "work");
            assert_eq!(result.frontmatter.get("status").unwrap(), "next-action");
        }

        #[tokio::test]
        async fn test_apply_task_template_removes_project_fields() {
            let mut existing_frontmatter = HashMap::new();
            existing_frontmatter.insert(
                "outcome".to_string(),
                serde_json::Value::String("some outcome".to_string()),
            );
            existing_frontmatter.insert(
                "start".to_string(),
                serde_json::Value::String("2026-01-01".to_string()),
            );

            let result = apply_template(
                "task".to_string(),
                existing_frontmatter,
                "# Content".to_string(),
            )
            .await
            .unwrap();

            assert!(!result.frontmatter.contains_key("outcome"));
            assert!(!result.frontmatter.contains_key("start"));
            assert!(!result.frontmatter.contains_key("end"));
        }

        #[tokio::test]
        async fn test_apply_project_template() {
            let existing_frontmatter = HashMap::new();
            let existing_content = "# Project Content".to_string();

            let result = apply_template(
                "project".to_string(),
                existing_frontmatter,
                existing_content.clone(),
            )
            .await
            .unwrap();

            assert_eq!(result.frontmatter.get("status").unwrap(), "active");
            assert!(result.frontmatter.contains_key("start"));
            assert!(result.frontmatter.contains_key("created"));
        }

        #[tokio::test]
        async fn test_apply_project_template_removes_task_fields() {
            let mut existing_frontmatter = HashMap::new();
            existing_frontmatter.insert(
                "due".to_string(),
                serde_json::Value::String("2026-01-15".to_string()),
            );
            existing_frontmatter.insert(
                "priority".to_string(),
                serde_json::Value::String("high".to_string()),
            );
            existing_frontmatter.insert(
                "waiting_for".to_string(),
                serde_json::Value::String("@John".to_string()),
            );

            let result = apply_template(
                "project".to_string(),
                existing_frontmatter,
                "# Content".to_string(),
            )
            .await
            .unwrap();

            assert!(!result.frontmatter.contains_key("due"));
            assert!(!result.frontmatter.contains_key("priority"));
            assert!(!result.frontmatter.contains_key("waiting_for"));
        }

        #[tokio::test]
        async fn test_apply_note_template() {
            let existing_frontmatter = HashMap::new();

            let result = apply_template(
                "note".to_string(),
                existing_frontmatter,
                "# Note Content".to_string(),
            )
            .await
            .unwrap();

            assert!(result.frontmatter.contains_key("created"));
            assert!(result.frontmatter.contains_key("tags"));
            assert!(result.frontmatter.get("tags").unwrap().is_array());
        }

        #[tokio::test]
        async fn test_apply_note_template_removes_task_project_fields() {
            let mut existing_frontmatter = HashMap::new();
            existing_frontmatter.insert(
                "status".to_string(),
                serde_json::Value::String("next-action".to_string()),
            );
            existing_frontmatter.insert(
                "due".to_string(),
                serde_json::Value::String("2026-01-15".to_string()),
            );
            existing_frontmatter.insert(
                "outcome".to_string(),
                serde_json::Value::String("some outcome".to_string()),
            );

            let result = apply_template(
                "note".to_string(),
                existing_frontmatter,
                "# Content".to_string(),
            )
            .await
            .unwrap();

            assert!(!result.frontmatter.contains_key("status"));
            assert!(!result.frontmatter.contains_key("due"));
            assert!(!result.frontmatter.contains_key("outcome"));
        }

        #[tokio::test]
        async fn test_apply_daily_template() {
            let existing_frontmatter = HashMap::new();

            let result = apply_template(
                "daily".to_string(),
                existing_frontmatter,
                "# Daily Note".to_string(),
            )
            .await
            .unwrap();

            assert!(result.frontmatter.contains_key("date"));
            let date = result.frontmatter.get("date").unwrap().as_str().unwrap();
            assert_eq!(date, today_date_string());
        }

        #[tokio::test]
        async fn test_apply_unknown_template() {
            let result = apply_template(
                "unknown".to_string(),
                HashMap::new(),
                "# Content".to_string(),
            )
            .await;

            assert!(result.is_err());
            assert!(result.unwrap_err().contains("Unknown template type"));
        }

        #[tokio::test]
        async fn test_template_does_not_overwrite_existing_status() {
            let mut existing_frontmatter = HashMap::new();
            existing_frontmatter.insert(
                "status".to_string(),
                serde_json::Value::String("waiting".to_string()),
            );

            let result = apply_template(
                "task".to_string(),
                existing_frontmatter,
                "# Content".to_string(),
            )
            .await
            .unwrap();

            // or_insert should preserve existing value
            assert_eq!(result.frontmatter.get("status").unwrap(), "waiting");
        }

        #[tokio::test]
        async fn test_template_sets_today_date() {
            let result = apply_template(
                "task".to_string(),
                HashMap::new(),
                "# Content".to_string(),
            )
            .await
            .unwrap();

            let created = result.frontmatter.get("created").unwrap().as_str().unwrap();
            assert_eq!(created, today_date_string());
        }
    }

    mod generate_daily_note_tests {
        use super::*;

        #[test]
        fn test_generate_daily_note_contains_sections() {
            let content = generate_daily_note_content();

            assert!(content.contains("## 📥 Inbox"));
            assert!(content.contains("## ✅ Tasks for Today"));
            assert!(content.contains("## 📝 Notes"));
            assert!(content.contains("## 📊 End of Day"));
        }

        #[test]
        fn test_generate_daily_note_contains_date_header() {
            let content = generate_daily_note_content();
            let today = Local::now();
            let expected_day = today.format("%A").to_string();

            assert!(content.contains(&expected_day));
        }

        #[test]
        fn test_generate_daily_note_contains_subsections() {
            let content = generate_daily_note_content();

            assert!(content.contains("### What got done"));
            assert!(content.contains("### What didn't get done"));
            assert!(content.contains("### Thoughts"));
        }

        #[test]
        fn test_generate_daily_note_starts_with_h1() {
            let content = generate_daily_note_content();

            assert!(content.starts_with("# "));
        }
    }
}
