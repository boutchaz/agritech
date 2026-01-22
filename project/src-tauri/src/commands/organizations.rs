use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    pub name: String,
    pub slug: Option<String>,
    pub description: Option<String>,
    pub currency_code: Option<String>,
    pub timezone: Option<String>,
    pub language: Option<String>,
    pub is_active: bool,
    pub onboarding_completed: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrganizationWithRole {
    pub id: String,
    pub name: String,
    pub slug: Option<String>,
    pub role: String,
    pub role_id: String,
    pub is_active: bool,
    pub onboarding_completed: bool,
    pub currency: Option<String>,
    pub timezone: Option<String>,
    pub language: Option<String>,
}

#[tauri::command]
pub fn get_organizations(
    app_handle: AppHandle,
    user_id: String,
) -> Result<Vec<OrganizationWithRole>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT o.id, o.name, o.slug, r.name as role, ou.role_id, o.is_active, 
                    o.onboarding_completed, o.currency_code, o.timezone, o.language
             FROM organizations o
             JOIN organization_users ou ON ou.organization_id = o.id
             JOIN roles r ON r.id = ou.role_id
             WHERE ou.user_id = ? AND ou.is_active = 1",
        )
        .map_err(|e| e.to_string())?;

    let orgs = stmt
        .query_map([&user_id], |row| {
            Ok(OrganizationWithRole {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                role: row.get(3)?,
                role_id: row.get(4)?,
                is_active: row.get::<_, i32>(5)? == 1,
                onboarding_completed: row.get::<_, i32>(6)? == 1,
                currency: row.get(7)?,
                timezone: row.get(8)?,
                language: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(orgs)
}

#[tauri::command]
pub fn get_organization_by_id(
    app_handle: AppHandle,
    org_id: String,
) -> Result<Option<Organization>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let result = conn.query_row(
        "SELECT id, name, slug, description, currency_code, timezone, language, 
                is_active, onboarding_completed, created_at, updated_at
         FROM organizations WHERE id = ?",
        [&org_id],
        |row| {
            Ok(Organization {
                id: row.get(0)?,
                name: row.get(1)?,
                slug: row.get(2)?,
                description: row.get(3)?,
                currency_code: row.get(4)?,
                timezone: row.get(5)?,
                language: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                onboarding_completed: row.get::<_, i32>(8)? == 1,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    );

    match result {
        Ok(org) => Ok(Some(org)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}
