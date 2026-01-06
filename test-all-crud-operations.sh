#!/bin/bash

# =============================================================================
# COMPREHENSIVE CRUD OPERATIONS TEST SUITE
# Tests all backend endpoints before production deployment
# =============================================================================

set -e

BASE_URL="${API_URL:-http://localhost:3000}"
OUTPUT_FILE="crud_test_results_$(date +%Y%m%d_%H%M%S).log"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "============================================================================" | tee -a "$OUTPUT_FILE"
echo "🧪 AgriTech Platform - Comprehensive CRUD Operations Test Suite" | tee -a "$OUTPUT_FILE"
echo "📅 Date: $(date)" | tee -a "$OUTPUT_FILE"
echo "🌐 API Base URL: $BASE_URL" | tee -a "$OUTPUT_FILE"
echo "============================================================================" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local method=$2
    local description=$3
    local expected_status=${4:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "[$TOTAL_TESTS] Testing: $description ... " | tee -a "$OUTPUT_FILE"

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
        -H "Content-Type: application/json" \
        "$BASE_URL$endpoint" 2>&1 || echo "000")

    if [ "$RESPONSE" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $RESPONSE)" | tee -a "$OUTPUT_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $RESPONSE)" | tee -a "$OUTPUT_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to test POST endpoint with data
test_post_endpoint() {
    local endpoint=$1
    local description=$2
    local data=$3
    local expected_status=${4:-201}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "[$TOTAL_TESTS] Testing: $description ... " | tee -a "$OUTPUT_FILE"

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$endpoint" 2>&1 || echo "000")

    if [ "$RESPONSE" = "$expected_status" ] || [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $RESPONSE)" | tee -a "$OUTPUT_FILE"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $RESPONSE)" | tee -a "$OUTPUT_FILE"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# =============================================================================
# CATEGORY 1: CORE AGRICULTURAL OPERATIONS
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}📦 CATEGORY 1: CORE AGRICULTURAL OPERATIONS${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "🌿 Parcels CRUD Operations:" | tee -a "$OUTPUT_FILE"
echo "   └─ GET /parcels (list)" | tee -a "$OUTPUT_FILE"
test_endpoint "/parcels" "GET" "List all parcels" "200"

echo "   └─ GET /parcels/:id (retrieve)" | tee -a "$OUTPUT_FILE"
test_endpoint "/parcels/123" "GET" "Get parcel by ID" "200"

echo "   └─ POST /parcels (create)" | tee -a "$OUTPUT_FILE"
test_post_endpoint "/parcels" "Create parcel" '{"name":"Test Parcel","area":1.5}' "201"

echo "   └─ PATCH /parcels/:id (update)" | tee -a "$OUTPUT_FILE"
test_endpoint "/parcels/123" "PATCH" "Update parcel" "200"

echo "   └─ DELETE /parcels/:id (delete)" | tee -a "$OUTPUT_FILE"
test_endpoint "/parcels/123" "DELETE" "Delete parcel" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "🏡 Farms CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/farms" "GET" "List all farms" "200"
test_post_endpoint "/farms" "Create farm" '{"name":"Test Farm","location":"Test Location"}' "201"
test_endpoint "/farms/123" "PATCH" "Update farm" "200"
test_endpoint "/farms/123" "DELETE" "Delete farm" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "🌳 Crops & Harvests:" | tee -a "$OUTPUT_FILE"
test_endpoint "/crop-cycles" "GET" "List crop cycles" "200"
test_endpoint "/harvests" "GET" "List harvests" "200"
test_post_endpoint "/harvests" "Create harvest" '{"parcelId":"123","date":"2024-01-01"}' "201"

# =============================================================================
# CATEGORY 2: WORKER & HR MANAGEMENT
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}👥 CATEGORY 2: WORKER & HR MANAGEMENT${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "👷 Workers CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/workers" "GET" "List all workers" "200"
test_post_endpoint "/workers" "Create worker" '{"firstName":"John","lastName":"Doe","type":"employee"}' "201"
test_endpoint "/workers/123" "PATCH" "Update worker" "200"
test_endpoint "/workers/123" "DELETE" "Delete worker" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "📋 Tasks Management:" | tee -a "$OUTPUT_FILE"
test_endpoint "/tasks" "GET" "List all tasks" "200"
test_post_endpoint "/tasks" "Create task" '{"title":"Test Task","priority":"medium"}' "201"
test_endpoint "/tasks/123" "PATCH" "Update task" "200"
test_endpoint "/tasks/123" "DELETE" "Delete task" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "💰 Piece Work (Day Laborers):" | tee -a "$OUTPUT_FILE"
test_endpoint "/piece-work" "GET" "List piece work records" "200"
test_post_endpoint "/piece-work" "Create piece work" '{"workerId":"123","date":"2024-01-01","amount":100}' "201"

# =============================================================================
# CATEGORY 3: ACCOUNTING & FINANCIAL OPERATIONS
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}💵 CATEGORY 3: ACCOUNTING & FINANCIAL OPERATIONS${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "📄 Invoices CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/invoices" "GET" "List all invoices" "200"
test_post_endpoint "/invoices" "Create invoice" '{"number":"INV-001","amount":1000}' "201"
test_endpoint "/invoices/123" "PATCH" "Update invoice" "200"
test_endpoint "/invoices/123" "DELETE" "Delete invoice" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "💳 Payments Management:" | tee -a "$OUTPUT_FILE"
test_endpoint "/payments" "GET" "List all payments" "200"
test_post_endpoint "/payments" "Create payment" '{"amount":500,"method":"transfer"}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "📝 Quotes CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/quotes" "GET" "List all quotes" "200"
test_post_endpoint "/quotes" "Create quote" '{"number":"QT-001","amount":2000}' "201"
test_endpoint "/quotes/123" "PATCH" "Update quote" "200"
test_endpoint "/quotes/123" "DELETE" "Delete quote" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "🛒 Purchase Orders CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/purchase-orders" "GET" "List all purchase orders" "200"
test_post_endpoint "/purchase-orders" "Create purchase order" '{"number":"PO-001","supplierId":"123"}' "201"
test_endpoint "/purchase-orders/123" "PATCH" "Update purchase order" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "📦 Sales Orders CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/sales-orders" "GET" "List all sales orders" "200"
test_post_endpoint "/sales-orders" "Create sales order" '{"number":"SO-001","customerId":"123"}' "201"
test_endpoint "/sales-orders/123" "PATCH" "Update sales order" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "📒 Journal Entries:" | tee -a "$OUTPUT_FILE"
test_endpoint "/journal-entries" "GET" "List journal entries" "200"
test_post_endpoint "/journal-entries" "Create journal entry" '{"date":"2024-01-01","description":"Test"}' "201"

# =============================================================================
# CATEGORY 4: INVENTORY & SUPPLY CHAIN
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}📦 CATEGORY 4: INVENTORY & SUPPLY CHAIN${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "📦 Items/Products CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/items" "GET" "List all items" "200"
test_post_endpoint "/items" "Create item" '{"name":"Test Item","type":"product"}' "201"
test_endpoint "/items/123" "PATCH" "Update item" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "🏪 Suppliers CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/suppliers" "GET" "List all suppliers" "200"
test_post_endpoint "/suppliers" "Create supplier" '{"name":"Test Supplier","email":"test@example.com"}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "👥 Customers CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/customers" "GET" "List all customers" "200"
test_post_endpoint "/customers" "Create customer" '{"name":"Test Customer","email":"customer@example.com"}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "📥 Stock Entries:" | tee -a "$OUTPUT_FILE"
test_endpoint "/stock-entries" "GET" "List stock entries" "200"
test_post_endpoint "/stock-entries" "Create stock entry" '{"itemId":"123","quantity":100}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "🚚 Deliveries CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/deliveries" "GET" "List all deliveries" "200"
test_post_endpoint "/deliveries" "Create delivery" '{"orderId":"123","status":"pending"}' "201"

# =============================================================================
# CATEGORY 5: PRODUCTION & QUALITY
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}🔬 CATEGORY 5: PRODUCTION & QUALITY${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "🧪 Quality Control CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/quality-control" "GET" "List quality control records" "200"
test_post_endpoint "/quality-control" "Create QC record" '{"parcelId":"123","date":"2024-01-01"}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "🔬 Lab Services CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/lab-services" "GET" "List lab services" "200"
test_post_endpoint "/lab-services" "Create lab service" '{"name":"Test Analysis","type":"soil"}' "201"

echo "" | tee -a "$OUTPUT_FILE"
echo "🌡️ Analyses CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/analyses" "GET" "List analyses" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "🌱 Soil Analyses CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/soil-analyses" "GET" "List soil analyses" "200"

# =============================================================================
# CATEGORY 6: REFERENCE DATA (CMS)
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}📚 CATEGORY 6: REFERENCE DATA (CMS)${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "📊 Reference Data Endpoints:" | tee -a "$OUTPUT_FILE"
test_endpoint "/reference-data/soil-types" "GET" "Get soil types from CMS" "200"
test_endpoint "/reference-data/irrigation-types" "GET" "Get irrigation types from CMS" "200"
test_endpoint "/reference-data/crop-categories" "GET" "Get crop categories from CMS" "200"
test_endpoint "/reference-data/crop-types" "GET" "Get crop types from CMS" "200"
test_endpoint "/reference-data/varieties" "GET" "Get varieties from CMS" "200"

# =============================================================================
# CATEGORY 7: MARKETPLACE
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}🛍️ CATEGORY 7: MARKETPLACE${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "🛒 Marketplace CRUD Operations:" | tee -a "$OUTPUT_FILE"
test_endpoint "/marketplace/products" "GET" "List marketplace products" "200"
test_endpoint "/marketplace/cart" "GET" "Get cart" "200"
test_endpoint "/marketplace/quote-requests" "GET" "List quote requests" "200"
test_endpoint "/marketplace/orders" "GET" "List marketplace orders" "200"

# =============================================================================
# CATEGORY 8: ADMIN & SETTINGS
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}⚙️ CATEGORY 8: ADMIN & SETTINGS${NC}" | tee -a "$OUTPUT_FILE"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$OUTPUT_FILE"

echo "" | tee -a "$OUTPUT_FILE"
echo "🏢 Organizations CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/organizations" "GET" "List organizations" "200"
test_endpoint "/organizations/123" "GET" "Get organization by ID" "200"
test_endpoint "/organizations/123" "PATCH" "Update organization" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "👤 Organization Users CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/organization-users" "GET" "List organization users" "200"
test_endpoint "/organization-users/123" "PATCH" "Update organization user" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "📁 Accounts & Accounting:" | tee -a "$OUTPUT_FILE"
test_endpoint "/accounts" "GET" "List chart of accounts" "200"
test_endpoint "/account-mappings" "GET" "List account mappings" "200"

echo "" | tee -a "$OUTPUT_FILE"
echo "💳 Bank Accounts CRUD:" | tee -a "$OUTPUT_FILE"
test_endpoint "/bank-accounts" "GET" "List bank accounts" "200"
test_post_endpoint "/bank-accounts" "Create bank account" '{"bankName":"Test Bank","accountNumber":"123456"}' "201"

# =============================================================================
# SUMMARY REPORT
# =============================================================================
echo "" | tee -a "$OUTPUT_FILE"
echo "============================================================================" | tee -a "$OUTPUT_FILE"
echo "📊 TEST SUMMARY REPORT" | tee -a "$OUTPUT_FILE"
echo "============================================================================" | tee -a "$OUTPUT_FILE"
echo "" | tee -a "$OUTPUT_FILE"
echo -e "Total Tests Run: ${BLUE}$TOTAL_TESTS${NC}" | tee -a "$OUTPUT_FILE"
echo -e "Tests Passed: ${GREEN}$PASSED_TESTS${NC}" | tee -a "$OUTPUT_FILE"
echo -e "Tests Failed: ${RED}$FAILED_TESTS${NC}" | tee -a "$OUTPUT_FILE"

PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "" | tee -a "$OUTPUT_FILE"
echo -e "Success Rate: ${PERCENTAGE}%" | tee -a "$OUTPUT_FILE"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "" | tee -a "$OUTPUT_FILE"
    echo -e "${GREEN}✅ ALL TESTS PASSED! Ready for production deployment.${NC}" | tee -a "$OUTPUT_FILE"
    echo "============================================================================" | tee -a "$OUTPUT_FILE"
    exit 0
else
    echo "" | tee -a "$OUTPUT_FILE"
    echo -e "${RED}❌ SOME TESTS FAILED! Please review and fix before production.${NC}" | tee -a "$OUTPUT_FILE"
    echo "============================================================================" | tee -a "$OUTPUT_FILE"
    exit 1
fi
