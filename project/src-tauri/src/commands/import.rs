use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use hmac::Hmac;
use pbkdf2::pbkdf2;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::Sha256;
use std::fs::File;
use std::io::Read;
use std::path::Path;
use std::sync::Mutex;
use tauri::AppHandle;
use zip::ZipArchive;

use crate::db;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub tables_imported: Vec<String>,
    pub records_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BundleValidation {
    pub valid: bool,
    pub export_version: Option<String>,
    pub schema_version: Option<String>,
    pub org_name: Option<String>,
    pub org_id: Option<String>,
    pub exported_at: Option<String>,
    pub tables_available: Option<Vec<String>>,
    pub total_records: Option<usize>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportStatus {
    pub in_progress: bool,
    pub current_table: Option<String>,
    pub progress_percent: u8,
    pub tables_completed: Vec<String>,
    pub error: Option<String>,
}

pub struct ImportState {
    pub status: Mutex<ImportStatus>,
}

impl Default for ImportState {
    fn default() -> Self {
        Self {
            status: Mutex::new(ImportStatus {
                in_progress: false,
                current_table: None,
                progress_percent: 0,
                tables_completed: Vec::new(),
                error: None,
            }),
        }
    }
}

/// Derive a 256-bit key from passphrase using PBKDF2-HMAC-SHA256
/// Matches the Web Crypto API implementation in ExportData.tsx
fn derive_key_from_passphrase(passphrase: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];

    // PBKDF2 with SHA-256, 100,000 iterations (matching Web Crypto API)
    pbkdf2::<Hmac<Sha256>>(passphrase.as_bytes(), salt, 100_000, &mut key)
        .map_err(|e| format!("PBKDF2 error: {}", e))?;

    Ok(key)
}

/// Decrypt data encrypted by the web app's ExportData.tsx
/// Format: [16-byte salt][12-byte IV][ciphertext + auth tag]
fn decrypt_data(encrypted_data: &[u8], passphrase: &str) -> Result<Vec<u8>, String> {
    // Minimum size: 16 (salt) + 12 (IV) + 16 (auth tag) = 44 bytes
    if encrypted_data.len() < 44 {
        return Err("Encrypted data too short".to_string());
    }

    // Parse the encrypted format: [salt][iv][ciphertext]
    let salt = &encrypted_data[..16];
    let iv = &encrypted_data[16..28];
    let ciphertext = &encrypted_data[28..];

    // Derive key using PBKDF2 (matching web app's Web Crypto API)
    let key = derive_key_from_passphrase(passphrase, salt)?;

    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| format!("Cipher error: {}", e))?;
    let nonce = Nonce::from_slice(iv);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed - incorrect passphrase or corrupted data".to_string())
}

fn read_bundle(bundle_path: &str, passphrase: &str) -> Result<Value, String> {
    let path = Path::new(bundle_path);

    if !path.exists() {
        return Err("Bundle file not found".to_string());
    }

    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("");

    match extension {
        "agritech" => {
            let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
            let mut encrypted_data = Vec::new();
            file.read_to_end(&mut encrypted_data)
                .map_err(|e| format!("Failed to read file: {}", e))?;

            let decrypted = decrypt_data(&encrypted_data, passphrase)?;
            let json_str = String::from_utf8(decrypted)
                .map_err(|_| "Invalid UTF-8 in decrypted data".to_string())?;

            serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))
        }
        "zip" => {
            let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
            let mut archive =
                ZipArchive::new(file).map_err(|e| format!("Invalid ZIP archive: {}", e))?;

            let file_names: Vec<String> = (0..archive.len())
                .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
                .collect();

            let (target_file, is_encrypted) = if file_names.iter().any(|n| n == "data.json.enc") {
                ("data.json.enc", true)
            } else if file_names.iter().any(|n| n == "data.json") {
                ("data.json", false)
            } else {
                return Err("No data file found in archive".to_string());
            };

            let mut data_file = archive
                .by_name(target_file)
                .map_err(|_| "Failed to read data file from archive".to_string())?;

            let mut contents = Vec::new();
            data_file
                .read_to_end(&mut contents)
                .map_err(|e| format!("Failed to read archive contents: {}", e))?;

            if is_encrypted {
                let decrypted = decrypt_data(&contents, passphrase)?;
                let json_str = String::from_utf8(decrypted)
                    .map_err(|_| "Invalid UTF-8 in decrypted data".to_string())?;
                serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))
            } else {
                let json_str = String::from_utf8(contents)
                    .map_err(|_| "Invalid UTF-8 in data file".to_string())?;
                serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))
            }
        }
        "json" => {
            let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
            let mut contents = String::new();
            file.read_to_string(&mut contents)
                .map_err(|e| format!("Failed to read file: {}", e))?;
            serde_json::from_str(&contents).map_err(|e| format!("Invalid JSON: {}", e))
        }
        _ => Err(format!("Unsupported file format: {}", extension)),
    }
}

#[tauri::command]
pub fn validate_bundle(
    _app_handle: AppHandle,
    bundle_path: String,
    passphrase: String,
) -> Result<BundleValidation, String> {
    if bundle_path.is_empty() {
        return Ok(BundleValidation {
            valid: false,
            export_version: None,
            schema_version: None,
            org_name: None,
            org_id: None,
            exported_at: None,
            tables_available: None,
            total_records: None,
            error: Some("Bundle path is required".to_string()),
        });
    }

    if passphrase.is_empty() {
        return Ok(BundleValidation {
            valid: false,
            export_version: None,
            schema_version: None,
            org_name: None,
            org_id: None,
            exported_at: None,
            tables_available: None,
            total_records: None,
            error: Some("Passphrase is required".to_string()),
        });
    }

    match read_bundle(&bundle_path, &passphrase) {
        Ok(data) => {
            let metadata = data.get("metadata").and_then(|m| m.as_array());

            let (export_version, org_id, org_name, exported_at) = if let Some(meta_array) = metadata
            {
                if let Some(meta) = meta_array.first() {
                    (
                        meta.get("version")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        meta.get("organizationId")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                        None,
                        meta.get("exportDate")
                            .and_then(|v| v.as_str())
                            .map(String::from),
                    )
                } else {
                    (None, None, None, None)
                }
            } else {
                (None, None, None, None)
            };

            let mut tables_available = Vec::new();
            let mut total_records = 0usize;

            if let Some(obj) = data.as_object() {
                for (key, value) in obj {
                    if key != "metadata" {
                        tables_available.push(key.clone());
                        if let Some(arr) = value.as_array() {
                            total_records += arr.len();
                        }
                    }
                }
            }

            let org_name_from_data = data
                .get("farms")
                .and_then(|f| f.as_array())
                .and_then(|arr| arr.first())
                .and_then(|f| f.get("organization_id"))
                .and_then(|v| v.as_str())
                .map(|_| "Imported Organization".to_string());

            Ok(BundleValidation {
                valid: true,
                export_version,
                schema_version: Some("2.0".to_string()),
                org_name: org_name.or(org_name_from_data),
                org_id,
                exported_at,
                tables_available: Some(tables_available),
                total_records: Some(total_records),
                error: None,
            })
        }
        Err(e) => Ok(BundleValidation {
            valid: false,
            export_version: None,
            schema_version: None,
            org_name: None,
            org_id: None,
            exported_at: None,
            tables_available: None,
            total_records: None,
            error: Some(e),
        }),
    }
}

const IMPORT_ORDER: &[&str] = &[
    "farms",
    "parcels",
    "workers",
    "cost_centers",
    "structures",
    "warehouses",
    "item_groups",
    "items",
    "customers",
    "suppliers",
    "tasks",
    "task_assignments",
    "harvest_records",
    "reception_batches",
    "stock_entries",
    "stock_entry_items",
    "quotes",
    "quote_items",
    "sales_orders",
    "sales_order_items",
    "purchase_orders",
    "purchase_order_items",
    "invoices",
    "invoice_items",
    "payments",
    "payment_allocations",
    "journal_entries",
    "journal_items",
    "costs",
    "revenues",
    "utilities",
];

fn get_table_columns(table: &str) -> Vec<&'static str> {
    match table {
        "farms" => vec![
            "id",
            "organization_id",
            "parent_farm_id",
            "name",
            "location",
            "city",
            "state",
            "country",
            "size",
            "size_unit",
            "description",
            "manager_name",
            "manager_email",
            "status",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "parcels" => vec![
            "id",
            "farm_id",
            "organization_id",
            "name",
            "description",
            "area",
            "area_unit",
            "boundary",
            "calculated_area",
            "perimeter",
            "soil_type",
            "irrigation_type",
            "crop_category",
            "crop_type",
            "variety",
            "planting_system",
            "spacing",
            "density_per_hectare",
            "plant_count",
            "planting_date",
            "planting_year",
            "rootstock",
            "is_active",
            "created_at",
            "updated_at",
        ],
        "workers" => vec![
            "id",
            "organization_id",
            "farm_id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "address",
            "national_id",
            "date_of_birth",
            "hire_date",
            "worker_type",
            "position",
            "employment_type",
            "daily_rate",
            "hourly_rate",
            "monthly_salary",
            "payment_method",
            "is_cnss_declared",
            "specialties",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "cost_centers" => vec![
            "id",
            "organization_id",
            "code",
            "name",
            "description",
            "parcel_id",
            "is_active",
            "created_at",
            "updated_at",
        ],
        "structures" => vec![
            "id",
            "organization_id",
            "farm_id",
            "name",
            "type",
            "location",
            "installation_date",
            "condition",
            "usage",
            "structure_details",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ],
        "warehouses" => vec![
            "id",
            "organization_id",
            "farm_id",
            "name",
            "description",
            "location",
            "capacity",
            "capacity_unit",
            "is_active",
            "created_at",
            "updated_at",
        ],
        "item_groups" => vec![
            "id",
            "organization_id",
            "name",
            "code",
            "description",
            "default_expense_account_id",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "items" => vec![
            "id",
            "organization_id",
            "item_code",
            "item_name",
            "description",
            "item_group_id",
            "is_stock_item",
            "is_purchase_item",
            "is_sales_item",
            "maintain_stock",
            "default_unit",
            "stock_uom",
            "standard_rate",
            "minimum_stock_level",
            "has_expiry_date",
            "valuation_method",
            "default_warehouse_id",
            "default_expense_account_id",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "customers" => vec![
            "id",
            "organization_id",
            "customer_code",
            "name",
            "customer_type",
            "email",
            "phone",
            "address",
            "city",
            "country",
            "tax_id",
            "payment_terms",
            "credit_limit",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "suppliers" => vec![
            "id",
            "organization_id",
            "supplier_code",
            "name",
            "supplier_type",
            "email",
            "phone",
            "address",
            "city",
            "country",
            "tax_id",
            "payment_terms",
            "is_active",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "tasks" => vec![
            "id",
            "organization_id",
            "farm_id",
            "parcel_id",
            "title",
            "description",
            "task_type",
            "status",
            "priority",
            "assigned_to",
            "scheduled_start",
            "scheduled_end",
            "actual_start",
            "actual_end",
            "due_date",
            "completed_date",
            "completion_percentage",
            "estimated_duration",
            "actual_duration",
            "weather_dependency",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "task_assignments" => vec![
            "id",
            "task_id",
            "worker_id",
            "assigned_at",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ],
        "harvest_records" => vec![
            "id",
            "organization_id",
            "farm_id",
            "parcel_id",
            "harvest_date",
            "quantity",
            "unit",
            "quality_grade",
            "quality_score",
            "quality_notes",
            "harvest_task_id",
            "workers",
            "status",
            "intended_for",
            "expected_price_per_unit",
            "warehouse_id",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "reception_batches" => vec![
            "id",
            "organization_id",
            "warehouse_id",
            "harvest_id",
            "parcel_id",
            "batch_code",
            "reception_date",
            "reception_time",
            "weight",
            "weight_unit",
            "quantity",
            "quantity_unit",
            "quality_grade",
            "quality_score",
            "quality_notes",
            "humidity_percentage",
            "maturity_level",
            "temperature",
            "moisture_content",
            "received_by",
            "quality_checked_by",
            "decision",
            "destination_warehouse_id",
            "status",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "stock_entries" => vec![
            "id",
            "organization_id",
            "entry_type",
            "from_warehouse_id",
            "to_warehouse_id",
            "reference",
            "entry_date",
            "notes",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "stock_entry_items" => vec![
            "id",
            "stock_entry_id",
            "item_id",
            "quantity",
            "unit_price",
            "total_amount",
            "source_warehouse_id",
            "target_warehouse_id",
            "batch_number",
            "expiry_date",
            "created_at",
        ],
        "quotes" => vec![
            "id",
            "organization_id",
            "quote_number",
            "quote_date",
            "valid_until",
            "customer_id",
            "customer_name",
            "status",
            "subtotal",
            "tax_total",
            "grand_total",
            "payment_terms",
            "delivery_terms",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "quote_items" => vec![
            "id",
            "quote_id",
            "line_number",
            "item_id",
            "item_name",
            "description",
            "quantity",
            "unit_of_measure",
            "unit_price",
            "discount_percent",
            "tax_rate",
            "amount",
            "tax_amount",
            "line_total",
            "created_at",
        ],
        "sales_orders" => vec![
            "id",
            "organization_id",
            "order_number",
            "order_date",
            "expected_delivery_date",
            "customer_id",
            "customer_name",
            "customer_address",
            "status",
            "subtotal",
            "tax_amount",
            "total_amount",
            "stock_issued",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "sales_order_items" => vec![
            "id",
            "sales_order_id",
            "line_number",
            "item_id",
            "item_name",
            "description",
            "quantity",
            "unit_of_measure",
            "unit_price",
            "discount_percent",
            "tax_rate",
            "amount",
            "tax_amount",
            "line_total",
            "created_at",
        ],
        "purchase_orders" => vec![
            "id",
            "organization_id",
            "order_number",
            "order_date",
            "expected_delivery_date",
            "supplier_id",
            "supplier_name",
            "supplier_contact",
            "status",
            "subtotal",
            "tax_amount",
            "total_amount",
            "stock_received",
            "stock_received_date",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "purchase_order_items" => vec![
            "id",
            "purchase_order_id",
            "line_number",
            "inventory_item_id",
            "item_name",
            "description",
            "quantity",
            "unit_of_measure",
            "unit_price",
            "discount_percent",
            "tax_rate",
            "amount",
            "tax_amount",
            "line_total",
            "created_at",
        ],
        "invoices" => vec![
            "id",
            "organization_id",
            "invoice_number",
            "invoice_date",
            "invoice_type",
            "party_id",
            "party_name",
            "party_type",
            "subtotal",
            "tax_total",
            "grand_total",
            "paid_amount",
            "outstanding_amount",
            "currency_code",
            "status",
            "due_date",
            "notes",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "invoice_items" => vec![
            "id",
            "invoice_id",
            "line_number",
            "item_id",
            "item_name",
            "description",
            "quantity",
            "unit_of_measure",
            "unit_price",
            "discount_percent",
            "tax_rate",
            "amount",
            "tax_amount",
            "line_total",
            "created_at",
        ],
        "payments" => vec![
            "id",
            "organization_id",
            "payment_number",
            "payment_type",
            "payment_method",
            "payment_date",
            "amount",
            "party_id",
            "party_name",
            "party_type",
            "reference_number",
            "currency_code",
            "status",
            "remarks",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "payment_allocations" => vec!["id", "payment_id", "invoice_id", "amount", "created_at"],
        "journal_entries" => vec![
            "id",
            "organization_id",
            "entry_number",
            "entry_date",
            "entry_type",
            "description",
            "total_debit",
            "total_credit",
            "status",
            "reference",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "journal_items" => vec![
            "id",
            "journal_entry_id",
            "account_id",
            "debit",
            "credit",
            "description",
            "parcel_id",
            "created_at",
        ],
        "costs" => vec![
            "id",
            "organization_id",
            "parcel_id",
            "cost_type",
            "amount",
            "currency",
            "date",
            "description",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "revenues" => vec![
            "id",
            "organization_id",
            "parcel_id",
            "revenue_type",
            "amount",
            "currency",
            "date",
            "crop_type",
            "quantity",
            "unit",
            "price_per_unit",
            "description",
            "created_by",
            "created_at",
            "updated_at",
        ],
        "utilities" => vec![
            "id",
            "organization_id",
            "farm_id",
            "parcel_id",
            "type",
            "provider",
            "account_number",
            "amount",
            "consumption_value",
            "consumption_unit",
            "billing_date",
            "due_date",
            "payment_status",
            "is_recurring",
            "recurring_frequency",
            "notes",
            "cost_per_parcel",
            "created_at",
            "updated_at",
        ],
        _ => vec![],
    }
}

fn value_to_sql(value: &Value) -> String {
    match value {
        Value::Null => "NULL".to_string(),
        Value::Bool(b) => if *b { "1" } else { "0" }.to_string(),
        Value::Number(n) => n.to_string(),
        Value::String(s) => format!("'{}'", s.replace('\'', "''")),
        Value::Array(_) | Value::Object(_) => {
            format!("'{}'", value.to_string().replace('\'', "''"))
        }
    }
}

fn insert_records(
    conn: &rusqlite::Connection,
    table: &str,
    records: &[Value],
) -> Result<usize, String> {
    let columns = get_table_columns(table);
    if columns.is_empty() {
        return Ok(0);
    }

    let mut inserted = 0;

    for record in records {
        if let Some(obj) = record.as_object() {
            let mut cols: Vec<&str> = Vec::new();
            let mut vals: Vec<String> = Vec::new();

            for col in &columns {
                if let Some(value) = obj.get(*col) {
                    cols.push(col);
                    vals.push(value_to_sql(value));
                }
            }

            if !cols.is_empty() {
                let sql = format!(
                    "INSERT OR REPLACE INTO {} ({}) VALUES ({})",
                    table,
                    cols.join(", "),
                    vals.join(", ")
                );

                match conn.execute(&sql, []) {
                    Ok(_) => inserted += 1,
                    Err(e) => {
                        eprintln!("Failed to insert into {}: {} - SQL: {}", table, e, sql);
                    }
                }
            }
        }
    }

    Ok(inserted)
}

#[tauri::command]
pub fn import_bundle(
    app_handle: AppHandle,
    bundle_path: String,
    passphrase: String,
) -> Result<ImportResult, String> {
    if bundle_path.is_empty() || passphrase.is_empty() {
        return Err("Bundle path and passphrase are required".to_string());
    }

    let data = read_bundle(&bundle_path, &passphrase)?;

    let conn = db::get_connection(&app_handle).map_err(|e| format!("Database error: {}", e))?;

    let mut tables_imported = Vec::new();
    let mut total_records = 0usize;

    let metadata = data.get("metadata").and_then(|m| m.as_array());
    let (org_id, exported_at) = if let Some(meta_array) = metadata {
        if let Some(meta) = meta_array.first() {
            (
                meta.get("organizationId")
                    .and_then(|v| v.as_str())
                    .map(String::from),
                meta.get("exportDate")
                    .and_then(|v| v.as_str())
                    .map(String::from),
            )
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    for table in IMPORT_ORDER {
        if let Some(records) = data.get(*table).and_then(|v| v.as_array()) {
            if !records.is_empty() {
                match insert_records(&conn, table, records) {
                    Ok(count) => {
                        if count > 0 {
                            tables_imported.push(table.to_string());
                            total_records += count;
                        }
                    }
                    Err(e) => {
                        eprintln!("Error importing {}: {}", table, e);
                    }
                }
            }
        }
    }

    let import_id = uuid::Uuid::new_v4().to_string();
    let tables_json = serde_json::to_string(&tables_imported).unwrap_or_default();

    let _ = conn.execute(
        "INSERT INTO import_metadata (id, export_version, schema_version, source_org_id, source_org_name, exported_at, tables_imported, records_count) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            import_id,
            "1.0",
            "2.0",
            org_id.unwrap_or_default(),
            "Imported Organization",
            exported_at.unwrap_or_default(),
            tables_json,
            total_records as i64
        ],
    );

    Ok(ImportResult {
        success: true,
        message: format!(
            "Successfully imported {} records from {} tables",
            total_records,
            tables_imported.len()
        ),
        tables_imported,
        records_count: total_records,
    })
}

#[tauri::command]
pub fn get_import_status(_app_handle: AppHandle) -> Result<ImportStatus, String> {
    Ok(ImportStatus {
        in_progress: false,
        current_table: None,
        progress_percent: 100,
        tables_completed: Vec::new(),
        error: None,
    })
}
