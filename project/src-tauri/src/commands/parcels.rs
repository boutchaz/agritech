use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Parcel {
    pub id: String,
    pub farm_id: String,
    pub organization_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub area: Option<f64>,
    pub area_unit: Option<String>,
    pub boundary: Option<String>,
    pub calculated_area: Option<f64>,
    pub perimeter: Option<f64>,
    pub soil_type: Option<String>,
    pub irrigation_type: Option<String>,
    pub crop_category: Option<String>,
    pub crop_type: Option<String>,
    pub variety: Option<String>,
    pub planting_system: Option<String>,
    pub spacing: Option<String>,
    pub density_per_hectare: Option<f64>,
    pub plant_count: Option<i32>,
    pub planting_date: Option<String>,
    pub planting_year: Option<i32>,
    pub rootstock: Option<String>,
    pub is_active: bool,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateParcelDto {
    pub farm_id: String,
    pub organization_id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    pub area: Option<f64>,
    pub area_unit: Option<String>,
    pub boundary: Option<String>,
    pub soil_type: Option<String>,
    pub irrigation_type: Option<String>,
    pub crop_category: Option<String>,
    pub crop_type: Option<String>,
    pub variety: Option<String>,
    pub planting_date: Option<String>,
    pub planting_year: Option<i32>,
    pub rootstock: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateParcelDto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub area: Option<f64>,
    pub area_unit: Option<String>,
    pub boundary: Option<String>,
    pub soil_type: Option<String>,
    pub irrigation_type: Option<String>,
    pub crop_category: Option<String>,
    pub crop_type: Option<String>,
    pub variety: Option<String>,
    pub planting_date: Option<String>,
    pub planting_year: Option<i32>,
    pub rootstock: Option<String>,
    pub is_active: Option<bool>,
}

fn row_to_parcel(row: &rusqlite::Row) -> rusqlite::Result<Parcel> {
    Ok(Parcel {
        id: row.get(0)?,
        farm_id: row.get(1)?,
        organization_id: row.get(2)?,
        name: row.get(3)?,
        description: row.get(4)?,
        area: row.get(5)?,
        area_unit: row.get(6)?,
        boundary: row.get(7)?,
        calculated_area: row.get(8)?,
        perimeter: row.get(9)?,
        soil_type: row.get(10)?,
        irrigation_type: row.get(11)?,
        crop_category: row.get(12)?,
        crop_type: row.get(13)?,
        variety: row.get(14)?,
        planting_system: row.get(15)?,
        spacing: row.get(16)?,
        density_per_hectare: row.get(17)?,
        plant_count: row.get(18)?,
        planting_date: row.get(19)?,
        planting_year: row.get(20)?,
        rootstock: row.get(21)?,
        is_active: row.get::<_, i32>(22)? == 1,
        created_at: row.get(23)?,
        updated_at: row.get(24)?,
    })
}

const SELECT_PARCEL_FIELDS: &str =
    "id, farm_id, organization_id, name, description, area, area_unit, boundary, 
     calculated_area, perimeter, soil_type, irrigation_type, crop_category, crop_type, 
     variety, planting_system, spacing, density_per_hectare, plant_count, planting_date, 
     planting_year, rootstock, is_active, created_at, updated_at";

#[tauri::command]
pub fn get_parcels(
    app_handle: AppHandle,
    farm_id: Option<String>,
    org_id: Option<String>,
) -> Result<Vec<Parcel>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let (query, params): (String, Vec<String>) = match (farm_id, org_id) {
        (Some(fid), _) => (
            format!(
                "SELECT {} FROM parcels WHERE farm_id = ? AND is_active = 1",
                SELECT_PARCEL_FIELDS
            ),
            vec![fid],
        ),
        (None, Some(oid)) => (
            format!(
                "SELECT {} FROM parcels WHERE organization_id = ? AND is_active = 1",
                SELECT_PARCEL_FIELDS
            ),
            vec![oid],
        ),
        (None, None) => (
            format!(
                "SELECT {} FROM parcels WHERE is_active = 1",
                SELECT_PARCEL_FIELDS
            ),
            vec![],
        ),
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let parcels = if params.is_empty() {
        stmt.query_map([], row_to_parcel)
    } else {
        stmt.query_map([&params[0]], row_to_parcel)
    }
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(parcels)
}

#[tauri::command]
pub fn get_parcel_by_id(
    app_handle: AppHandle,
    parcel_id: String,
) -> Result<Option<Parcel>, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let query = format!("SELECT {} FROM parcels WHERE id = ?", SELECT_PARCEL_FIELDS);
    let result = conn.query_row(&query, [&parcel_id], row_to_parcel);

    match result {
        Ok(parcel) => Ok(Some(parcel)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn create_parcel(app_handle: AppHandle, parcel: CreateParcelDto) -> Result<Parcel, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO parcels (id, farm_id, organization_id, name, description, area, area_unit, 
         boundary, soil_type, irrigation_type, crop_category, crop_type, variety, 
         planting_date, planting_year, rootstock, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
        rusqlite::params![
            &id,
            &parcel.farm_id,
            &parcel.organization_id,
            &parcel.name,
            &parcel.description,
            &parcel.area,
            &parcel.area_unit,
            &parcel.boundary,
            &parcel.soil_type,
            &parcel.irrigation_type,
            &parcel.crop_category,
            &parcel.crop_type,
            &parcel.variety,
            &parcel.planting_date,
            &parcel.planting_year,
            &parcel.rootstock,
            &now,
            &now,
        ],
    )
    .map_err(|e| e.to_string())?;

    get_parcel_by_id(app_handle, id)?.ok_or("Failed to retrieve created parcel".to_string())
}

#[tauri::command]
pub fn update_parcel(
    app_handle: AppHandle,
    parcel_id: String,
    updates: UpdateParcelDto,
) -> Result<Parcel, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut query = String::from("UPDATE parcels SET updated_at = ?");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now)];

    macro_rules! add_update {
        ($field:ident) => {
            if let Some(val) = updates.$field {
                query.push_str(concat!(", ", stringify!($field), " = ?"));
                params.push(Box::new(val));
            }
        };
    }

    add_update!(name);
    add_update!(description);
    add_update!(area);
    add_update!(area_unit);
    add_update!(boundary);
    add_update!(soil_type);
    add_update!(irrigation_type);
    add_update!(crop_category);
    add_update!(crop_type);
    add_update!(variety);
    add_update!(planting_date);
    add_update!(planting_year);
    add_update!(rootstock);

    if let Some(is_active) = updates.is_active {
        query.push_str(", is_active = ?");
        params.push(Box::new(if is_active { 1 } else { 0 }));
    }

    query.push_str(" WHERE id = ?");
    params.push(Box::new(parcel_id.clone()));

    let params_ref: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_ref.as_slice())
        .map_err(|e| e.to_string())?;

    get_parcel_by_id(app_handle, parcel_id)?.ok_or("Parcel not found".to_string())
}

#[tauri::command]
pub fn delete_parcel(app_handle: AppHandle, parcel_id: String) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE parcels SET is_active = 0, updated_at = ? WHERE id = ?",
        [&chrono::Utc::now().to_rfc3339(), &parcel_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
