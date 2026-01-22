use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalUser {
    pub id: String,
    pub email: String,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub full_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalSession {
    pub user: LocalUser,
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthStatus {
    pub is_authenticated: bool,
    pub user: Option<LocalUser>,
}

#[tauri::command]
pub fn local_login(
    app_handle: AppHandle,
    email: String,
    password: String,
) -> Result<LocalSession, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let user: Result<LocalUser, _> = conn.query_row(
        "SELECT id, email, first_name, last_name, full_name, password_hash FROM user_profiles WHERE email = ?",
        [&email],
        |row| {
            let password_hash: Option<String> = row.get(5)?;
            Ok((
                LocalUser {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    first_name: row.get(2)?,
                    last_name: row.get(3)?,
                    full_name: row.get(4)?,
                },
                password_hash,
            ))
        },
    ).map_err(|_| "Invalid email or password".to_string())?;

    let (user, password_hash) = user.map_err(|e: rusqlite::Error| e.to_string())?;

    if let Some(hash) = password_hash {
        let valid = bcrypt::verify(&password, &hash).unwrap_or(false);
        if !valid {
            return Err("Invalid email or password".to_string());
        }
    } else {
        return Err("No password set for this user".to_string());
    }

    let session_id = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(30))
        .unwrap()
        .to_rfc3339();

    conn.execute(
        "INSERT INTO local_sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
        [&session_id, &user.id, &expires_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(LocalSession { user, session_id })
}

#[tauri::command]
pub fn local_logout(app_handle: AppHandle, session_id: String) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM local_sessions WHERE id = ?", [&session_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_current_user(app_handle: AppHandle, session_id: String) -> Result<Option<LocalUser>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let result: Result<LocalUser, _> = conn.query_row(
        "SELECT u.id, u.email, u.first_name, u.last_name, u.full_name 
         FROM user_profiles u
         JOIN local_sessions s ON s.user_id = u.id
         WHERE s.id = ? AND (s.expires_at IS NULL OR s.expires_at > datetime('now'))",
        [&session_id],
        |row| {
            Ok(LocalUser {
                id: row.get(0)?,
                email: row.get(1)?,
                first_name: row.get(2)?,
                last_name: row.get(3)?,
                full_name: row.get(4)?,
            })
        },
    );

    match result {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn check_auth_status(app_handle: AppHandle) -> Result<AuthStatus, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let result: Result<LocalUser, _> = conn.query_row(
        "SELECT u.id, u.email, u.first_name, u.last_name, u.full_name 
         FROM user_profiles u
         JOIN local_sessions s ON s.user_id = u.id
         WHERE s.expires_at IS NULL OR s.expires_at > datetime('now')
         ORDER BY s.created_at DESC
         LIMIT 1",
        [],
        |row| {
            Ok(LocalUser {
                id: row.get(0)?,
                email: row.get(1)?,
                first_name: row.get(2)?,
                last_name: row.get(3)?,
                full_name: row.get(4)?,
            })
        },
    );

    match result {
        Ok(user) => Ok(AuthStatus {
            is_authenticated: true,
            user: Some(user),
        }),
        Err(_) => Ok(AuthStatus {
            is_authenticated: false,
            user: None,
        }),
    }
}
