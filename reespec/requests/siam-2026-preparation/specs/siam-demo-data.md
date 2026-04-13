# Spec: SIAM Demo Data Enrichment

## GIVEN an organization exists with the standard demo data seeded
## WHEN the admin triggers `seedSiamDemoData` from the demo data settings page
## THEN the organization gains SIAM-specific data:
  - 3 farms ("Ferme Atlas" 180ha olive irrigated, "Ferme Ziz" 90ha citrus drip, "Ferme Rif" 50ha cereals+olive rainfed)
  - 15-20 parcels with Meknès-area coordinates, Moroccan varieties (Picholine Marocaine, Haouzia), mixed planting years
  - Calibration data for 5+ parcels (all 8 pipeline steps with health scores, anomalies, zones)
  - 3-5 AgromindIA Level 1 recommendations in French
  - 2-3 years of harvest records
  - Soil + water analyses for key parcels

### GIVEN the SIAM demo data has been seeded
### WHEN `getDataStats()` is called
### THEN the stats include counts for all new SIAM entities with correct table names

### GIVEN the SIAM demo data has been seeded
### WHEN `clearDemoData()` is called
### THEN all SIAM-specific data is removed without affecting the org itself
