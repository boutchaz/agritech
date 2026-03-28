# Spec: Module Integrations

Each module follows the same pattern. Specs per phase.

---

## Phase 1 — AgromindIA

### GIVEN an AI recommendation is created for a parcel
### WHEN createRecommendation completes successfully
### THEN org_admin and farm_manager users (excluding the triggering user) receive a notification with type=ai_recommendation_created, title containing the parcel name, and data containing {recommendationId, parcelId, priority, alertCode}

### GIVEN an AI alert is triggered (NDVI anomaly, pest risk, etc.)
### WHEN createAiAlert completes successfully
### THEN org_admin and farm_manager users receive a notification with type=ai_alert_triggered, title containing the alert description, and data containing {alertId, parcelId, alertCode, severity}

---

## Phase 2 — Operations

### GIVEN a crop cycle status changes (e.g., planning → active → harvest → closed)
### WHEN updateStatus completes successfully
### THEN org_admin and farm_manager users (excluding actor) receive type=crop_cycle_status_changed with data containing {cropCycleId, parcelName, cropName, oldStatus, newStatus}

### GIVEN a campaign status changes
### WHEN updateStatus completes successfully
### THEN org_admin and farm_manager users (excluding actor) receive type=campaign_status_changed with data containing {campaignId, campaignName, oldStatus, newStatus}

### GIVEN a task assignment is created (worker assigned to task)
### WHEN createAssignment completes successfully
### THEN org_admin, farm_manager, AND the assigned worker receive type=task_reassigned with data containing {taskId, assignmentId, workerId, workerName}

### GIVEN piece work is created for workers
### WHEN create completes successfully
### THEN org_admin, farm_manager, and farm_worker users (excluding actor) receive type=piece_work_created with data containing {pieceWorkId, description, farmName}

---

## Phase 3 — Finance

### GIVEN an invoice is created (sales or purchase)
### WHEN create completes successfully
### THEN org_admin and farm_manager users (excluding actor) receive type=invoice_created with data containing {invoiceId, invoiceNumber, invoiceType, amount, currency}

### GIVEN a journal entry is posted (finalized)
### WHEN post completes successfully
### THEN org_admin users only (excluding actor) receive type=journal_entry_posted with data containing {journalEntryId, entryNumber, totalDebit, totalCredit}

### GIVEN a payment status changes (created, processed, failed)
### WHEN create or updateStatus completes successfully
### THEN org_admin and farm_manager users (excluding actor) receive type=payment_status_changed with data containing {paymentId, amount, currency, status}

---

## Phase 4 — Agronomy

### GIVEN a lab order is completed / results become available
### WHEN updateOrder sets status to completed
### THEN org_admin and farm_manager users (excluding actor) receive type=lab_results_available with data containing {labOrderId, sampleType, parcelName}

### GIVEN a product application is recorded (pesticide, fertilizer, etc.)
### WHEN createProductApplication completes successfully
### THEN org_admin, farm_manager, and farm_worker users (excluding actor) receive type=product_application_completed with data containing {applicationId, productName, parcelName, quantity}

### GIVEN a soil analysis is completed
### WHEN update sets status to completed (or create with completed status)
### THEN org_admin and farm_manager users (excluding actor) receive type=soil_analysis_completed with data containing {analysisId, parcelName, analysisType}

### GIVEN a harvest event is recorded
### WHEN create completes successfully
### THEN org_admin, farm_manager, and farm_worker users (excluding actor) receive type=harvest_event_recorded with data containing {harvestEventId, cropName, parcelName, quantity, unit}

### GIVEN a work unit is completed
### WHEN update sets status to completed
### THEN org_admin, farm_manager, and farm_worker users (excluding actor) receive type=work_unit_completed with data containing {workUnitId, description, workerName, hours}
