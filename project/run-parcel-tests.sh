#!/bin/bash

# Parcel Creation Test Runner
# Quick script to run Playwright tests for parcel creation

echo "🚀 AgriTech Parcel Creation Tests"
echo "=================================="
echo ""

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

# Function to display menu
show_menu() {
    echo "Select test mode:"
    echo "1) Run all tests (headless)"
    echo "2) Run in headed mode (see browser)"
    echo "3) Run in UI mode (interactive)"
    echo "4) Run in debug mode"
    echo "5) Run specific test"
    echo "6) View test report"
    echo "7) Exit"
    echo ""
    read -p "Enter choice [1-7]: " choice
}

# Function to run tests
run_tests() {
    case $1 in
        1)
            echo "🏃 Running all tests in headless mode..."
            npm run test:e2e -- parcel-creation-production
            ;;
        2)
            echo "🏃 Running tests in headed mode..."
            npm run test:e2e:headed -- parcel-creation-production
            ;;
        3)
            echo "🏃 Running tests in UI mode..."
            npm run test:e2e:ui -- parcel-creation-production
            ;;
        4)
            echo "🏃 Running tests in debug mode..."
            npm run test:e2e:debug -- parcel-creation-production
            ;;
        5)
            echo "Available tests:"
            echo "1) should create a new parcel successfully"
            echo "2) should navigate to farm hierarchy and create parcel from there"
            echo "3) should validate required fields in parcel form"
            echo ""
            read -p "Enter test number [1-3]: " test_num
            
            case $test_num in
                1)
                    npm run test:e2e -- parcel-creation-production -g "should create a new parcel successfully"
                    ;;
                2)
                    npm run test:e2e -- parcel-creation-production -g "should navigate to farm hierarchy and create parcel from there"
                    ;;
                3)
                    npm run test:e2e -- parcel-creation-production -g "should validate required fields in parcel form"
                    ;;
                *)
                    echo "❌ Invalid test number"
                    ;;
            esac
            ;;
        6)
            echo "📊 Opening test report..."
            npm run test:e2e:report
            ;;
        7)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            ;;
    esac
}

# Main loop
while true; do
    show_menu
    run_tests $choice
    echo ""
    echo "=================================="
    echo ""
    read -p "Press Enter to continue..."
done
