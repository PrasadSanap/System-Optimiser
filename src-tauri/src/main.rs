// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::fs;

// ─── Path Validation Helper ───────────────────────────────────────────────────
/// Validates and normalizes a user-supplied path string.
/// Returns a canonical, OS-appropriate PathBuf or a user-friendly error string.
fn validate_path(raw: &str) -> Result<PathBuf, String> {
    // 1. Reject empty input
    if raw.trim().is_empty() {
        return Err("Error: Path cannot be empty. Please provide a valid file path.".to_string());
    }

    // 2. Use std::path for cross-platform handling (handles \ vs / automatically)
    let path = Path::new(raw);

    // 3. Check for path traversal attempts
    let normalized = path
        .components()
        .fold(PathBuf::new(), |mut acc, comp| {
            match comp {
                std::path::Component::ParentDir => { acc.pop(); acc }
                _ => { acc.push(comp); acc }
            }
        });

    // 4. Verify the path actually exists
    if !normalized.exists() {
        return Err(format!(
            "Error: Path '{}' does not exist or is not accessible. Please check the path and try again.",
            normalized.display()
        ));
    }

    // 5. Return canonical form (resolves symlinks, makes absolute)
    normalized.canonicalize().map_err(|e| {
        format!("Error: Could not resolve path '{}'. Reason: {}", normalized.display(), e)
    })
}

// ─── Tauri Commands ───────────────────────────────────────────────────────────

/// Example: Get disk usage for a given path
#[tauri::command]
fn get_disk_usage(path: String) -> Result<String, String> {
    let validated = validate_path(&path)?;

    fs::metadata(&validated).map(|meta| {
        format!("Path: {}\nSize: {} bytes", validated.display(), meta.len())
    }).map_err(|e| match e.kind() {
        std::io::ErrorKind::PermissionDenied =>
            "Error: Access Denied. Please run the tool with appropriate permissions.".to_string(),
        std::io::ErrorKind::NotFound =>
            format!("Error: '{}' was not found.", validated.display()),
        _ =>
            format!("Error: An unexpected error occurred: {}", e),
    })
}

/// Example: Clear temp files from a given directory
#[tauri::command]
fn clear_temp_files(dir_path: String) -> Result<String, String> {
    let validated = validate_path(&dir_path)?;

    // Ensure it's a directory, not a file
    if !validated.is_dir() {
        return Err(format!(
            "Error: '{}' is not a directory. Please provide a directory path.",
            validated.display()
        ));
    }

    let entries = fs::read_dir(&validated).map_err(|e| match e.kind() {
        std::io::ErrorKind::PermissionDenied =>
            "Error: Access Denied. Please run the tool with appropriate permissions.".to_string(),
        _ => format!("Error reading directory: {}", e),
    })?;

    let mut count = 0u32;
    for entry in entries.flatten() {
        let p = entry.path();
        if p.extension().map_or(false, |ext| ext == "tmp" || ext == "temp") {
            if let Err(e) = fs::remove_file(&p) {
                // Log but don't crash — skip files we can't delete
                eprintln!("Warning: Could not delete {:?}: {}", p, e);
            } else {
                count += 1;
            }
        }
    }

    Ok(format!("Successfully removed {} temporary file(s) from '{}'.", count, validated.display()))
}

/// Example: Read a config/log file safely
#[tauri::command]
fn read_system_file(file_path: String) -> Result<String, String> {
    let validated = validate_path(&file_path)?;

    if !validated.is_file() {
        return Err(format!(
            "Error: '{}' is not a file.",
            validated.display()
        ));
    }

    fs::read_to_string(&validated).map_err(|e| match e.kind() {
        std::io::ErrorKind::PermissionDenied =>
            "Error: Access Denied. Please run the tool with appropriate permissions.".to_string(),
        _ => format!("Error reading file '{}': {}", validated.display(), e),
    })
}

// ─── Main ─────────────────────────────────────────────────────────────────────
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_disk_usage,
            clear_temp_files,
            read_system_file,
            // ... your other existing commands
        ])
        .run(tauri::generate_context!())
        .expect("Error: Failed to start System Optimiser. Check your system configuration.");
}