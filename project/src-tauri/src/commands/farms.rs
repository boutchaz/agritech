use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Farm {
    pub id: String,
    pub organization_id: String,
    pub name: String,
    pub location: Option<String>,
    pub size: Option<f64>,
    pub size_unit: Option<String>,
    pub manager_name: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateFarmDto {
    pub organization_id: String,
    pub name: String,
    pub location: Option<String>,
    pub size: Option<f64>,
    pub size_unit: Option<String>,
    pub manager_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFarmDto {
    pub name: Option<String>,
    pub location: Option<String>,
    pub size: Option<f64>,
    pub size_unit: Option<String>,
    pub manager_name: Option<String>,
    pub is_active: Option<bool>,
}

#[tauri::command]
pub fn get_farms(app_handle: AppHandle, org_id: String) -> Result<Vec<Farm>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, organization_id, name, location, size, size_unit, manager_name, 
                    is_active, created_at, updated_at
             FROM farms WHERE organization_id = ? AND is_active = 1",
        )
        .map_err(|e| e.to_string())?;

    let farms = stmt
        .query_map([&org_id], |row| {
            Ok(Farm {
                id: row.get(0)?,
                organization_id: row.get(1)?,
                name: row.get(2)?,
                location: row.get(3)?,
                size: row.get(4)?,
                size_unit: row.get(5)?,
                manager_name: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(farms)
}

#[tauri::command]
pub fn get_farm_by_id(app_handle: AppHandle, farm_id: String) -> Result<Option<Farm>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let result = conn.query_row(
        "SELECT id, organization_id, name, location, size, size_unit, manager_name, 
                is_active, created_at, updated_at
         FROM farms WHERE id = ?",
        [&farm_id],
        |row| {
            Ok(Farm {
                id: row.get(0)?,
                organization_id: row.get(1)?,
                name: row.get(2)?,
                location: row.get(3)?,
                size: row.get(4)?,
                size_unit: row.get(5)?,
                manager_name: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    );

    match result {
        Ok(farm) => Ok(Some(farm)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn create_farm(app_handle: AppHandle, farm: CreateFarmDto) -> Result<Farm, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO farms (id, organization_id, name, location, size, size_unit, manager_name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
        rusqlite::params![
            &id,
            &farm.organization_id,
            &farm.name,
            &farm.location,
            &farm.size,
            &farm.size_unit,
            &farm.manager_name,
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_farm_by_id(app_handle, id)?.ok_or("Failed to retrieve created farm".to_string())
}

#[tauri::command]
pub fn update_farm(
    app_handle: AppHandle,
    farm_id: String,
    updates: UpdateFarmDto,
) -> Result<Farm, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut query = String::from("UPDATE farms SET updated_at = ?");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];

    if let Some(name) = updates.name {
        query.push_str(", name = ?");
        params.push(Box::new(name));
    }
    if let Some(location) = updates.location {
        query.push_str(", location = ?");
        params.push(Box::new(location));
    }
    if let Some(size) = updates.size {
        query.push_str(", size = ?");
        params.push(Box::new(size));
    }
    if let Some(size_unit) = updates.size_unit {
        query.push_str(", size_unit = ?");
        params.push(Box::new(size_unit));
    }
    if let Some(manager_name) = updates.manager_name {
        query.push_str(", manager_name = ?");
        params.push(Box::new(manager_name));
    }
    if let Some(is_active) = updates.is_active {
        query.push_str(", is_active = ?");
        params.push(Box::new(if is_active { 1 } else { 0 }));
    }

    query.push_str(" WHERE id = ?");
    params.push(Box::new(farm_id.clone()));

    let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_ref.as_slice())
        .map_err(|e| e.to_string())?;

    get_farm_by_id(app_handle, farm_id)?.ok_or("Farm not found".to_string())
}

#[tauri::command]
pub fn delete_farm(app_handle: AppHandle, farm_id: String) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE farms SET is_active = 0, updated_at = ? WHERE id = ?",
        [&chrono::Utc::now().to_rfc3339(), &farm_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
