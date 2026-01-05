#!/bin/bash

# Comprehensive CRUD Operations Test Script for AgriTech Platform
# Tests all critical CRUD endpoints before production deployment

BASE_URL="http://localhost:3001"
AUTH_TOKEN=""
ORG_ID=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to print test results
print_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers="-H 'Content-Type: application/json'"

    if [ -n "$AUTH_TOKEN" ]; then
        headers="$headers -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi

    if [ -n "$ORG_ID" ]; then
        headers="$headers -H 'X-Organization-Id: $ORG_ID'"
    fi

    if [ "$method" = "GET" ]; then
        curl -s -X GET "$BASE_URL$endpoint" $headers
    elif [ "$method" = "POST" ]; then
        curl -s -X POST "$BASE_URL$endpoint" $headers -d "$data"
    elif [ "$method" = "PATCH" ]; then
        curl -s -X PATCH "$BASE_URL$endpoint" $headers -d "$data"
    elif [ "$method" = "DELETE" ]; then
        curl -s -X DELETE "$BASE_URL$endpoint" $headers
    fi
}

echo "=================================================="
echo "AgriTech CRUD Operations Test Suite"
echo "=================================================="
echo ""

# Test 1: Backend Health Check
echo -e "${YELLOW}Test 1: Backend Health Check${NC}"
response=$(curl -s "$BASE_URL/api/v1/health")
if echo "$response" | grep -q '"status":"ok"'; then
    print_result 0 "Backend API is healthy"
else
    print_result 1 "Backend API health check failed"
fi
echo ""

# Test 2: Authentication
echo -e "${YELLOW}Test 2: Authentication${NC}"
login_response=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"zakaria.boutchamir@gmail.com","password":"boutchaz"}')

if echo "$login_response" | grep -q "access_token"; then
    AUTH_TOKEN=$(echo "$login_response" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    print_result 0 "User authentication successful"
    echo "  Token obtained: ${AUTH_TOKEN:0:20}..."
else
    print_result 1 "User authentication failed"
    echo "  Response: $login_response"
fi
echo ""

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}Cannot proceed without authentication token${NC}"
    exit 1
fi

# Test 3: Get Organizations
echo -e "${YELLOW}Test 3: Get Organizations${NC}"
orgs_response=$(api_call "GET" "/api/v1/organizations")
if echo "$orgs_response" | grep -q "id"; then
    ORG_ID=$(echo "$orgs_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Organizations retrieved successfully"
    echo "  Organization ID: $ORG_ID"
else
    print_result 1 "Failed to retrieve organizations"
fi
echo ""

if [ -z "$ORG_ID" ]; then
    echo -e "${RED}Cannot proceed without organization ID${NC}"
    exit 1
fi

# Test 4: Farms CRUD
echo -e "${YELLOW}Test 4: Farms CRUD Operations${NC}"

# CREATE Farm
farm_data='{"name":"E2E Test Farm","location":"Test Location","size":100}'
farm_response=$(api_call "POST" "/api/v1/farms" "$farm_data")
FARM_ID=""

if echo "$farm_response" | grep -q "id"; then
    FARM_ID=$(echo "$farm_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Farm created (ID: $FARM_ID)"
else
    print_result 1 "Farm creation failed"
fi

# READ Farms
farms_list=$(api_call "GET" "/api/v1/farms")
if echo "$farms_list" | grep -q "$FARM_ID"; then
    print_result 0 "Farm retrieved successfully"
else
    print_result 1 "Farm retrieval failed"
fi

# UPDATE Farm
if [ -n "$FARM_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/farms/$FARM_ID" '{"name":"Updated E2E Test Farm"}')
    if echo "$update_response" | grep -q "Updated E2E Test Farm"; then
        print_result 0 "Farm updated successfully"
    else
        print_result 1 "Farm update failed"
    fi
fi

# DELETE Farm
if [ -n "$FARM_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/farms/$FARM_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Farm deleted successfully"
    else
        print_result 1 "Farm deletion failed"
    fi
fi
echo ""

# Test 5: Workers CRUD
echo -e "${YELLOW}Test 5: Workers CRUD Operations${NC}"

worker_data='{"firstName":"Test","lastName":"Worker","email":"test-worker-'$(date +%s)'@example.com","worker_type":"daily_worker"}'
worker_response=$(api_call "POST" "/api/v1/workers" "$worker_data")
WORKER_ID=""

if echo "$worker_response" | grep -q "id"; then
    WORKER_ID=$(echo "$worker_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Worker created (ID: $WORKER_ID)"
else
    print_result 1 "Worker creation failed"
fi

# READ Workers
workers_list=$(api_call "GET" "/api/v1/workers")
if echo "$workers_list" | grep -q "id"; then
    print_result 0 "Workers list retrieved successfully"
else
    print_result 1 "Workers list retrieval failed"
fi

# UPDATE Worker
if [ -n "$WORKER_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/workers/$WORKER_ID" '{"firstName":"Updated"}')
    if echo "$update_response" | grep -q "Updated"; then
        print_result 0 "Worker updated successfully"
    else
        print_result 1 "Worker update failed"
    fi
fi

# DELETE Worker
if [ -n "$WORKER_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/workers/$WORKER_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Worker deleted successfully"
    else
        print_result 1 "Worker deletion failed"
    fi
fi
echo ""

# Test 6: Parcels CRUD
echo -e "${YELLOW}Test 6: Parcels CRUD Operations${NC}"

parcel_data='{"name":"E2E Test Parcel","area":10.5,"location":"Test Location"}'
parcel_response=$(api_call "POST" "/api/v1/parcels" "$parcel_data")
PARCEL_ID=""

if echo "$parcel_response" | grep -q "id"; then
    PARCEL_ID=$(echo "$parcel_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Parcel created (ID: $PARCEL_ID)"
else
    print_result 1 "Parcel creation failed"
fi

# READ Parcels
parcels_list=$(api_call "GET" "/api/v1/parcels")
if echo "$parcels_list" | grep -q "id"; then
    print_result 0 "Parcels list retrieved successfully"
else
    print_result 1 "Parcels list retrieval failed"
fi

# UPDATE Parcel
if [ -n "$PARCEL_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/parcels/$PARCEL_ID" '{"name":"Updated E2E Test Parcel"}')
    if echo "$update_response" | grep -q "Updated"; then
        print_result 0 "Parcel updated successfully"
    else
        print_result 1 "Parcel update failed"
    fi
fi

# DELETE Parcel
if [ -n "$PARCEL_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/parcels/$PARCEL_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Parcel deleted successfully"
    else
        print_result 1 "Parcel deletion failed"
    fi
fi
echo ""

# Test 7: Tasks CRUD
echo -e "${YELLOW}Test 7: Tasks CRUD Operations${NC}"

task_data='{"title":"E2E Test Task","description":"Test task created by E2E automation","priority":"medium","status":"pending"}'
task_response=$(api_call "POST" "/api/v1/tasks" "$task_data")
TASK_ID=""

if echo "$task_response" | grep -q "id"; then
    TASK_ID=$(echo "$task_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Task created (ID: $TASK_ID)"
else
    print_result 1 "Task creation failed"
fi

# READ Tasks
tasks_list=$(api_call "GET" "/api/v1/tasks")
if echo "$tasks_list" | grep -q "id"; then
    print_result 0 "Tasks list retrieved successfully"
else
    print_result 1 "Tasks list retrieval failed"
fi

# UPDATE Task
if [ -n "$TASK_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/tasks/$TASK_ID" '{"title":"Updated E2E Test Task"}')
    if echo "$update_response" | grep -q "Updated"; then
        print_result 0 "Task updated successfully"
    else
        print_result 1 "Task update failed"
    fi
fi

# DELETE Task
if [ -n "$TASK_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/tasks/$TASK_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Task deleted successfully"
    else
        print_result 1 "Task deletion failed"
    fi
fi
echo ""

# Test 8: Customers CRUD
echo -e "${YELLOW}Test 8: Customers CRUD Operations${NC}"

customer_data='{"name":"E2E Test Customer","email":"test-customer-'$(date +%s)'@example.com","phone":"+212600000000","address":"Test Address"}'
customer_response=$(api_call "POST" "/api/v1/customers" "$customer_data")
CUSTOMER_ID=""

if echo "$customer_response" | grep -q "id"; then
    CUSTOMER_ID=$(echo "$customer_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Customer created (ID: $CUSTOMER_ID)"
else
    print_result 1 "Customer creation failed"
fi

# READ Customers
customers_list=$(api_call "GET" "/api/v1/customers")
if echo "$customers_list" | grep -q "id"; then
    print_result 0 "Customers list retrieved successfully"
else
    print_result 1 "Customers list retrieval failed"
fi

# UPDATE Customer
if [ -n "$CUSTOMER_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/customers/$CUSTOMER_ID" '{"name":"Updated E2E Test Customer"}')
    if echo "$update_response" | grep -q "Updated"; then
        print_result 0 "Customer updated successfully"
    else
        print_result 1 "Customer update failed"
    fi
fi

# DELETE Customer
if [ -n "$CUSTOMER_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/customers/$CUSTOMER_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Customer deleted successfully"
    else
        print_result 1 "Customer deletion failed"
    fi
fi
echo ""

# Test 9: Suppliers CRUD
echo -e "${YELLOW}Test 9: Suppliers CRUD Operations${NC}"

supplier_data='{"name":"E2E Test Supplier","email":"test-supplier-'$(date +%s)'@example.com","phone":"+212600000000","address":"Test Address"}'
supplier_response=$(api_call "POST" "/api/v1/suppliers" "$supplier_data")
SUPPLIER_ID=""

if echo "$supplier_response" | grep -q "id"; then
    SUPPLIER_ID=$(echo "$supplier_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Supplier created (ID: $SUPPLIER_ID)"
else
    print_result 1 "Supplier creation failed"
fi

# READ Suppliers
suppliers_list=$(api_call "GET" "/api/v1/suppliers")
if echo "$suppliers_list" | grep -q "id"; then
    print_result 0 "Suppliers list retrieved successfully"
else
    print_result 1 "Suppliers list retrieval failed"
fi

# UPDATE Supplier
if [ -n "$SUPPLIER_ID" ]; then
    update_response=$(api_call "PATCH" "/api/v1/suppliers/$SUPPLIER_ID" '{"name":"Updated E2E Test Supplier"}')
    if echo "$update_response" | grep -q "Updated"; then
        print_result 0 "Supplier updated successfully"
    else
        print_result 1 "Supplier update failed"
    fi
fi

# DELETE Supplier
if [ -n "$SUPPLIER_ID" ]; then
    delete_response=$(api_call "DELETE" "/api/v1/suppliers/$SUPPLIER_ID")
    if [ $? -eq 0 ]; then
        print_result 0 "Supplier deleted successfully"
    else
        print_result 1 "Supplier deletion failed"
    fi
fi
echo ""

# Test 10: Invoices CRUD
echo -e "${YELLOW}Test 10: Invoices CRUD Operations${NC}"

invoice_data='{"customer_id":"'$CUSTOMER_ID'","invoice_date":"'$(date -I)'","due_date":"'$(date -d '+30 days' -I)'","total_amount":1000,"status":"draft"}'
invoice_response=$(api_call "POST" "/api/v1/invoices" "$invoice_data")
INVOICE_ID=""

if echo "$invoice_response" | grep -q "id"; then
    INVOICE_ID=$(echo "$invoice_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    print_result 0 "Invoice created (ID: $INVOICE_ID)"
else
    print_result 1 "Invoice creation failed - this may be expected if customer_id is required"
fi

# READ Invoices
invoices_list=$(api_call "GET" "/api/v1/invoices")
if echo "$invoices_list" | grep -q "id"; then
    print_result 0 "Invoices list retrieved successfully"
else
    print_result 1 "Invoices list retrieval failed"
fi
echo ""

# Summary
echo "=================================================="
echo "Test Summary"
echo "=================================================="
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All CRUD operations are working correctly!${NC}"
    echo "Ready for production deployment."
    exit 0
else
    echo -e "${RED}✗ Some CRUD operations failed. Please review the failures above.${NC}"
    echo "NOT ready for production deployment."
    exit 1
fi
