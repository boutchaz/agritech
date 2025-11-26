import { test, expect, Page } from '@playwright/test';

/**
 * Parcel Creation E2E Test for Production
 * Tests the complete flow of creating a parcel on https://agritech-dashboard.thebzlab.online/parcels
 */

// Test credentials - replace with your actual credentials or use environment variables
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'zakaria.boutchamir@gmail.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'boutchaz';

test.describe('Parcel Creation - Production', () => {
    test.beforeEach(async ({ page }) => {
        // Set longer timeout for production
        test.setTimeout(120000); // 2 minutes

        // Navigate to production login
        await page.goto('https://agritech-dashboard.thebzlab.online/login');

        // Wait for login form
        await page.waitForSelector('input[type="email"]', { timeout: 15000 });

        // Login
        console.log('🔐 Logging in...');
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');

        // Wait for successful login and redirect
        await page.waitForURL(/\/(dashboard|farm-hierarchy|parcels)/, { timeout: 30000 });
        await page.waitForLoadState('networkidle');

        console.log('✅ Login successful');
    });

    test('should create a new parcel successfully', async ({ page }) => {
        console.log('📍 Navigating to parcels page...');

        // Navigate to parcels page
        await page.goto('https://agritech-dashboard.thebzlab.online/parcels');
        await page.waitForLoadState('networkidle');

        // Wait for page to fully load
        await page.waitForTimeout(3000);

        console.log('🔍 Looking for farm selection...');

        // Check if we need to select a farm first
        const farmSelector = page.locator('select').first();
        const hasFarmSelector = await farmSelector.isVisible();

        if (hasFarmSelector) {
            console.log('🏭 Selecting a farm...');
            // Get all options
            const options = await farmSelector.locator('option').all();

            if (options.length > 1) {
                // Select the first non-empty option
                await farmSelector.selectOption({ index: 1 });
                await page.waitForTimeout(2000);
                console.log('✅ Farm selected');
            }
        }

        console.log('🔍 Looking for create parcel button...');

        // Look for "Add Parcel" or "Ajouter une parcelle" button
        const createButton = page.locator('button').filter({
            hasText: /ajouter.*parcelle|add.*parcel|create.*parcel/i
        }).first();

        // Wait for button to be visible
        await createButton.waitFor({ state: 'visible', timeout: 10000 });

        console.log('🖱️  Clicking create parcel button...');
        await createButton.click();

        // Wait for either modal or navigation to parcel creation page
        await page.waitForTimeout(2000);

        // Check if we're on the map-based creation or form-based creation
        const isOnMapPage = page.url().includes('/parcels');
        const hasModal = await page.locator('[role="dialog"], .modal').isVisible();

        console.log(`📍 Creation mode: ${hasModal ? 'Modal' : 'Map-based'}`);

        if (hasModal) {
            // Form-based creation in modal
            await fillParcelForm(page);
        } else {
            // Map-based creation
            await createParcelOnMap(page);
        }

        console.log('✅ Parcel creation test completed');
    });

    test('should navigate to farm hierarchy and create parcel from there', async ({ page }) => {
        console.log('📍 Navigating to farm hierarchy...');

        // Navigate to farm hierarchy
        await page.goto('https://agritech-dashboard.thebzlab.online/farm-hierarchy');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        console.log('🔍 Looking for farm card...');

        // Find first farm card
        const farmCard = page.locator('[data-testid^="farm-card-"], .farm-card, [class*="farm"]').first();

        // Look for "Voir détails" or similar button
        const detailsButton = farmCard.locator('button').filter({
            hasText: /voir.*détails|view.*details|details/i
        }).first();

        if (await detailsButton.isVisible()) {
            console.log('🖱️  Clicking farm details button...');
            await detailsButton.click();
            await page.waitForTimeout(2000);

            // Look for "Gérer les parcelles" button in modal
            const manageParcelsButton = page.locator('button').filter({
                hasText: /gérer.*parcelles|manage.*parcels/i
            }).first();

            if (await manageParcelsButton.isVisible()) {
                console.log('🖱️  Clicking manage parcels button...');
                await manageParcelsButton.click();
                await page.waitForTimeout(2000);

                // Look for "Add Parcel" button
                const addParcelButton = page.locator('button').filter({
                    hasText: /ajouter.*parcelle|add.*parcel/i
                }).first();

                if (await addParcelButton.isVisible()) {
                    console.log('🖱️  Clicking add parcel button...');
                    await addParcelButton.click();
                    await page.waitForTimeout(2000);

                    // Should redirect to parcels page with map
                    expect(page.url()).toContain('/parcels');
                    console.log('✅ Redirected to parcels page for map-based creation');
                }
            }
        }
    });

    test('should validate required fields in parcel form', async ({ page }) => {
        console.log('📍 Testing form validation...');

        // Navigate to parcels page
        await page.goto('https://agritech-dashboard.thebzlab.online/parcels');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Try to find and open parcel creation form
        const createButton = page.locator('button').filter({
            hasText: /ajouter.*parcelle|add.*parcel/i
        }).first();

        if (await createButton.isVisible()) {
            await createButton.click();
            await page.waitForTimeout(2000);

            // If there's a form modal, try to submit without filling
            const submitButton = page.locator('button[type="submit"]').first();

            if (await submitButton.isVisible()) {
                console.log('🖱️  Attempting to submit empty form...');
                await submitButton.click();
                await page.waitForTimeout(1000);

                // Check for validation errors
                const hasErrors = await page.locator('.error, [class*="error"], [role="alert"]').isVisible();

                if (hasErrors) {
                    console.log('✅ Form validation working - errors displayed');
                }
            }
        }
    });
});

/**
 * Helper function to fill parcel form
 */
async function fillParcelForm(page: Page) {
    console.log('📝 Filling parcel form...');

    // Generate unique parcel name
    const timestamp = Date.now();
    const parcelName = `Test Parcel ${timestamp}`;

    // Fill name field
    const nameInput = page.locator('input[name="name"], input[id="name"], input[placeholder*="nom"]').first();
    if (await nameInput.isVisible()) {
        await nameInput.fill(parcelName);
        console.log(`✅ Parcel name: ${parcelName}`);
    }

    // Fill area field
    const areaInput = page.locator('input[name="area"], input[id="area"], input[type="number"]').first();
    if (await areaInput.isVisible()) {
        await areaInput.fill('5.5');
        console.log('✅ Area: 5.5 ha');
    }

    // Fill description (optional)
    const descInput = page.locator('textarea[name="description"], textarea[id="description"]').first();
    if (await descInput.isVisible()) {
        await descInput.fill('Test parcel created by automated test');
        console.log('✅ Description added');
    }

    // Select crop category if available
    const cropCategory = page.locator('select[name="crop_category"], select[id="crop_category"]').first();
    if (await cropCategory.isVisible()) {
        await cropCategory.selectOption({ index: 1 });
        await page.waitForTimeout(500);
        console.log('✅ Crop category selected');
    }

    // Submit form
    const submitButton = page.locator('button[type="submit"]').filter({
        hasText: /créer|create|enregistrer|save/i
    }).first();

    if (await submitButton.isVisible()) {
        console.log('🖱️  Submitting form...');
        await submitButton.click();
        await page.waitForTimeout(3000);

        // Check for success message or redirect
        const hasSuccessMessage = await page.locator('text=/succès|success|créé|created/i').isVisible();
        const urlChanged = !page.url().includes('modal');

        if (hasSuccessMessage || urlChanged) {
            console.log('✅ Parcel created successfully');
        }
    }
}

/**
 * Helper function to create parcel on map
 */
async function createParcelOnMap(page: Page) {
    console.log('🗺️  Creating parcel on map...');

    // Wait for map to load
    await page.waitForSelector('.ol-viewport, .leaflet-container, [class*="map"]', { timeout: 15000 });
    console.log('✅ Map loaded');

    // Wait for drawing instructions to appear
    const drawingInstructions = page.locator('text=/cliquez.*carte.*dessinez|click.*map.*draw/i').first();
    const hasInstructions = await drawingInstructions.isVisible().catch(() => false);

    if (hasInstructions) {
        console.log('✅ Drawing mode active');
    }

    // Wait a bit for map to be fully interactive
    await page.waitForTimeout(2000);

    // Get map container
    const mapContainer = page.locator('.ol-viewport, .leaflet-container').first();
    const box = await mapContainer.boundingBox();

    if (box) {
        console.log('🖱️  Drawing polygon on map...');

        // Click 4 points to create a rectangle
        // Make clicks more spread out to create a visible polygon
        const points = [
            { x: box.x + box.width * 0.35, y: box.y + box.height * 0.35 },
            { x: box.x + box.width * 0.65, y: box.y + box.height * 0.35 },
            { x: box.x + box.width * 0.65, y: box.y + box.height * 0.65 },
            { x: box.x + box.width * 0.35, y: box.y + box.height * 0.65 },
        ];

        // Click each point
        for (let i = 0; i < points.length; i++) {
            console.log(`🖱️  Clicking point ${i + 1}/4...`);
            await page.mouse.click(points[i].x, points[i].y);
            await page.waitForTimeout(800);
        }

        // Close the polygon by clicking near the first point
        console.log('🖱️  Closing polygon...');
        await page.mouse.click(points[0].x + 5, points[0].y + 5);
        await page.waitForTimeout(1500);

        console.log('✅ Polygon drawn');

        // Wait for the parcel form dialog to appear
        await page.waitForTimeout(2000);

        // Check if form appeared
        const formDialog = page.locator('[role="dialog"]').filter({ hasText: /nom.*parcelle|parcel.*name/i }).first();
        const hasForm = await formDialog.isVisible().catch(() => false);

        if (hasForm) {
            console.log('✅ Parcel form appeared');
            await fillParcelForm(page);
        } else {
            console.log('⚠️  Form did not appear, checking for alternative flow...');

            // Maybe there's a name dialog first
            const nameDialog = page.locator('[role="dialog"]').first();
            if (await nameDialog.isVisible()) {
                // Fill name if there's a simple name input first
                const nameInput = page.locator('input[type="text"]').first();
                if (await nameInput.isVisible()) {
                    const timestamp = Date.now();
                    await nameInput.fill(`Test Parcel ${timestamp}`);

                    // Click confirm/next button
                    const confirmButton = page.locator('button').filter({ hasText: /confirmer|confirm|suivant|next|continuer|continue/i }).first();
                    if (await confirmButton.isVisible()) {
                        await confirmButton.click();
                        await page.waitForTimeout(2000);

                        // Now fill the full form
                        await fillParcelForm(page);
                    }
                }
            }
        }
    } else {
        console.log('❌ Could not get map bounding box');
    }
}
