use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

pub struct Database {
    pub conn: Mutex<Connection>,
}

pub fn get_db_path(app_handle: &AppHandle) -> PathBuf {
    let app_dir = app_handle
        .path_resolver()
        .app_data_dir()
        .expect("Failed to get app data directory");
    std::fs::create_dir_all(&app_dir).expect("Failed to create app data directory");
    app_dir.join("agritech.db")
}

pub fn init_database(app_handle: &AppHandle) -> Result<()> {
    let db_path = get_db_path(app_handle);
    let conn = Connection::open(&db_path)?;
    
    conn.execute_batch(include_str!("schema.sql"))?;
    
    Ok(())
}

pub fn get_connection(app_handle: &AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app_handle);
    Connection::open(&db_path)
}
