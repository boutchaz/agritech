// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.handle();
            if let Err(e) = db::init_database(&app_handle) {
                eprintln!("Failed to initialize database: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth commands
            commands::auth::local_login,
            commands::auth::local_logout,
            commands::auth::get_current_user,
            commands::auth::check_auth_status,
            commands::auth::local_setup,
            commands::auth::check_has_users,
            // Organization commands
            commands::organizations::get_organizations,
            commands::organizations::get_organization_by_id,
            // Farm commands
            commands::farms::get_farms,
            commands::farms::get_farm_by_id,
            commands::farms::create_farm,
            commands::farms::update_farm,
            commands::farms::delete_farm,
            // Parcel commands
            commands::parcels::get_parcels,
            commands::parcels::get_parcel_by_id,
            commands::parcels::create_parcel,
            commands::parcels::update_parcel,
            commands::parcels::delete_parcel,
            // Import commands
            commands::import::import_bundle,
            commands::import::validate_bundle,
            commands::import::get_import_status,
            // Generic data commands
            commands::data::query_table,
            commands::data::insert_record,
            commands::data::update_record,
            commands::data::delete_record,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
