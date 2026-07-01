use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize)]
struct VaultEntry {
    path: String,
    name: String,
    kind: String,
    size: Option<u64>,
    #[serde(rename = "mtimeMs")]
    mtime_ms: Option<u64>,
}

fn normalize_rel(path: &str) -> Result<PathBuf, String> {
    let mut out = PathBuf::new();
    for comp in Path::new(path).components() {
        match comp {
            Component::Normal(p) => out.push(p),
            Component::ParentDir => return Err("path traversal".into()),
            Component::RootDir | Component::Prefix(_) => return Err("absolute path".into()),
            Component::CurDir => {}
        }
    }
    Ok(out)
}

fn resolve(root: &str, rel: &str) -> Result<PathBuf, String> {
    let base = PathBuf::from(root);
    let rel = normalize_rel(rel)?;
    Ok(base.join(rel))
}

#[tauri::command]
fn pick_vault_folder(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app
        .dialog()
        .file()
        .blocking_pick_folder();
    folder
        .map(|p| p.to_string())
        .ok_or_else(|| "cancelled".into())
}

#[tauri::command]
fn vault_read_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_read_binary(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_write_text(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = format!("{}.tmp", path);
    fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_write_binary(path: String, content: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = format!("{}.tmp", path);
    fs::write(&tmp, &content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_delete(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn vault_mkdir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn vault_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
fn vault_list(root: String, dir: String) -> Result<Vec<VaultEntry>, String> {
    let target = if dir.is_empty() {
        PathBuf::from(&root)
    } else {
        resolve(&root, &dir)?
    };
    let mut entries = Vec::new();
    let read_dir = fs::read_dir(&target).map_err(|e| e.to_string())?;
    for entry in read_dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let meta = entry.metadata().map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let rel = if dir.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", dir.replace('\\', "/"), name)
        };
        entries.push(VaultEntry {
            path: rel,
            name,
            kind: if meta.is_dir() { "directory" } else { "file" }.into(),
            size: if meta.is_file() { Some(meta.len()) } else { None },
            mtime_ms: meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as u64),
        });
    }
    entries.sort_by(|a, b| {
        if a.kind != b.kind {
            return a.kind.cmp(&b.kind);
        }
        a.name.cmp(&b.name)
    });
    Ok(entries)
}

#[tauri::command]
fn vault_asset_url(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    let mime = match Path::new(&path).extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    };
    Ok(format!("data:{};base64,{}", mime, STANDARD.encode(bytes)))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            pick_vault_folder,
            vault_read_text,
            vault_read_binary,
            vault_write_text,
            vault_write_binary,
            vault_delete,
            vault_mkdir,
            vault_exists,
            vault_list,
            vault_asset_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
