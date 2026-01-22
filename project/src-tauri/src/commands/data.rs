use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;

use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub rows: Vec<Value>,
    pub total: usize,
}

#[tauri::command]
pub fn query_table(
    app_handle: AppHandle,
    table: String,
    filters: Option<Value>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<QueryResult, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let allowed_tables = vec![
        "organizations",
        "farms",
        "parcels",
        "workers",
        "tasks",
        "harvests",
        "customers",
        "suppliers",
        "accounts",
        "journal_entries",
        "invoices",
        "purchase_orders",
        "sales_orders",
        "inventory_items",
        "stock_entries",
    ];

    if !allowed_tables.contains(&table.as_str()) {
        return Err(format!("Table '{}' is not allowed", table));
    }

    let mut query = format!("SELECT * FROM {}", table);
    let mut count_query = format!("SELECT COUNT(*) FROM {}", table);
    let mut params: Vec<String> = vec![];

    if let Some(Value::Object(filter_map)) = filters {
        let mut conditions = vec![];
        for (key, value) in filter_map {
            if let Value::String(v) = value {
                conditions.push(format!("{} = ?", key));
                params.push(v);
            } else if let Value::Number(n) = value {
                conditions.push(format!("{} = ?", key));
                params.push(n.to_string());
            } else if let Value::Bool(b) = value {
                conditions.push(format!("{} = ?", key));
                params.push(if b { "1" } else { "0" }.to_string());
            }
        }
        if !conditions.is_empty() {
            let where_clause = format!(" WHERE {}", conditions.join(" AND "));
            query.push_str(&where_clause);
            count_query.push_str(&where_clause);
        }
    }

    let total: usize = {
        let mut stmt = conn.prepare(&count_query).map_err(|e| e.to_string())?;
        let params_ref: Vec<&dyn rusqlite::ToSql> =
            params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        stmt.query_row(params_ref.as_slice(), |row| row.get(0))
            .map_err(|e| e.to_string())?
    };

    if let Some(l) = limit {
        query.push_str(&format!(" LIMIT {}", l));
    }
    if let Some(o) = offset {
        query.push_str(&format!(" OFFSET {}", o));
    }

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let column_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let params_ref: Vec<&dyn rusqlite::ToSql> =
        params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

    let rows = stmt
        .query_map(params_ref.as_slice(), |row| {
            let mut obj = serde_json::Map::new();
            for (i, col_name) in column_names.iter().enumerate() {
                let value: Value = match row.get_ref(i) {
                    Ok(rusqlite::types::ValueRef::Null) => Value::Null,
                    Ok(rusqlite::types::ValueRef::Integer(i)) => Value::Number(i.into()),
                    Ok(rusqlite::types::ValueRef::Real(f)) => {
                        serde_json::Number::from_f64(f).map_or(Value::Null, Value::Number)
                    }
                    Ok(rusqlite::types::ValueRef::Text(t)) => {
                        Value::String(String::from_utf8_lossy(t).to_string())
                    }
                    Ok(rusqlite::types::ValueRef::Blob(b)) => Value::String(
                        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, b),
                    ),
                    Err(_) => Value::Null,
                };
                obj.insert(col_name.clone(), value);
            }
            Ok(Value::Object(obj))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(QueryResult { rows, total })
}

#[tauri::command]
pub fn insert_record(app_handle: AppHandle, table: String, data: Value) -> Result<String, String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let allowed_tables = vec![
        "farms",
        "parcels",
        "workers",
        "tasks",
        "harvests",
        "customers",
        "suppliers",
        "journal_entries",
        "invoices",
        "purchase_orders",
        "sales_orders",
        "inventory_items",
        "stock_entries",
    ];

    if !allowed_tables.contains(&table.as_str()) {
        return Err(format!("Table '{}' is not allowed for insert", table));
    }

    let obj = data.as_object().ok_or("Data must be an object")?;
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let mut columns = vec![
        "id".to_string(),
        "created_at".to_string(),
        "updated_at".to_string(),
    ];
    let mut placeholders = vec!["?".to_string(); 3];
    let mut values: Vec<String> = vec![id.clone(), now.clone(), now];

    for (key, value) in obj {
        if key == "id" || key == "created_at" || key == "updated_at" {
            continue;
        }
        columns.push(key.clone());
        placeholders.push("?".to_string());
        values.push(match value {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
            Value::Null => "NULL".to_string(),
            _ => value.to_string(),
        });
    }

    let query = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        table,
        columns.join(", "),
        placeholders.join(", ")
    );

    let values_ref: Vec<&dyn rusqlite::ToSql> =
        values.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

    conn.execute(&query, values_ref.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
pub fn update_record(
    app_handle: AppHandle,
    table: String,
    id: String,
    data: Value,
) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let allowed_tables = vec![
        "farms",
        "parcels",
        "workers",
        "tasks",
        "harvests",
        "customers",
        "suppliers",
        "journal_entries",
        "invoices",
        "purchase_orders",
        "sales_orders",
        "inventory_items",
        "stock_entries",
    ];

    if !allowed_tables.contains(&table.as_str()) {
        return Err(format!("Table '{}' is not allowed for update", table));
    }

    let obj = data.as_object().ok_or("Data must be an object")?;
    let now = chrono::Utc::now().to_rfc3339();

    let mut sets = vec!["updated_at = ?".to_string()];
    let mut values: Vec<String> = vec![now];

    for (key, value) in obj {
        if key == "id" || key == "created_at" || key == "updated_at" {
            continue;
        }
        sets.push(format!("{} = ?", key));
        values.push(match value {
            Value::String(s) => s.clone(),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
            Value::Null => "NULL".to_string(),
            _ => value.to_string(),
        });
    }

    values.push(id);

    let query = format!("UPDATE {} SET {} WHERE id = ?", table, sets.join(", "));

    let values_ref: Vec<&dyn rusqlite::ToSql> =
        values.iter().map(|s| s as &dyn rusqlite::ToSql).collect();

    conn.execute(&query, values_ref.as_slice())
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_record(app_handle: AppHandle, table: String, id: String) -> Result<(), String> {
    let conn = db::get_connection(&app_handle).map_err(|e| e.to_string())?;

    let allowed_tables = vec![
        "farms",
        "parcels",
        "workers",
        "tasks",
        "harvests",
        "customers",
        "suppliers",
        "journal_entries",
        "invoices",
        "purchase_orders",
        "sales_orders",
        "inventory_items",
        "stock_entries",
    ];

    if !allowed_tables.contains(&table.as_str()) {
        return Err(format!("Table '{}' is not allowed for delete", table));
    }

    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        &format!(
            "UPDATE {} SET is_active = 0, updated_at = ? WHERE id = ?",
            table
        ),
        [&now, &id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}
