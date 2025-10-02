"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_1 = require("@polar-sh/sdk");
// Load environment variables
var POLAR_ACCESS_TOKEN = process.env.VITE_POLAR_ACCESS_TOKEN;
var POLAR_ORGANIZATION_ID = process.env.VITE_POLAR_ORGANIZATION_ID;
if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
    console.error('❌ Missing required environment variables:');
    console.error('   - VITE_POLAR_ACCESS_TOKEN');
    console.error('   - VITE_POLAR_ORGANIZATION_ID');
    console.error('\nPlease add them to your .env file');
    process.exit(1);
}
var polar = new sdk_1.Polar({
    accessToken: POLAR_ACCESS_TOKEN,
});
var products = [
    {
        name: 'Essential Plan',
        description: 'Perfect for small commercial farms digitizing their operations. Includes 3 agriculture modules (Fruit Trees, Cereals, Vegetables), core tools for farm management, employee tracking, and basic inventory management.',
        prices: [
            {
                amount: 2500, // $25.00 in cents
                currency: 'USD',
                recurring_interval: 'month',
            },
        ],
        metadata: {
            plan_type: 'essential',
            max_farms: '2',
            max_parcels: '25',
            max_users: '5',
            max_satellite_reports: '0',
            has_analytics: 'false',
            has_sensor_integration: 'false',
            has_ai_recommendations: 'false',
            has_advanced_reporting: 'false',
            has_api_access: 'false',
            has_priority_support: 'false',
            available_modules: 'fruit-trees,cereals,vegetables',
        },
        is_highlighted: false,
    },
    {
        name: 'Professional Plan',
        description: 'For data-driven farms leveraging analytics and precision agriculture. Includes 5 modules (Essential + Mushrooms, Livestock), satellite analysis, sensor integration, and AI-powered recommendations.',
        prices: [
            {
                amount: 7500, // $75.00 in cents
                currency: 'USD',
                recurring_interval: 'month',
            },
        ],
        metadata: {
            plan_type: 'professional',
            max_farms: '10',
            max_parcels: '200',
            max_users: '25',
            max_satellite_reports: '10',
            has_analytics: 'true',
            has_sensor_integration: 'true',
            has_ai_recommendations: 'true',
            has_advanced_reporting: 'true',
            has_api_access: 'false',
            has_priority_support: 'false',
            available_modules: 'fruit-trees,cereals,vegetables,mushrooms,livestock',
        },
        is_highlighted: true,
    },
    {
        name: 'Agri-Business Plan',
        description: 'For large enterprises with complex agricultural operations. All modules unlocked, unlimited everything, full financial suite, predictive analytics, API access, and priority support.',
        prices: [], // Contact sales - no fixed price
        metadata: {
            plan_type: 'enterprise',
            max_farms: 'unlimited',
            max_parcels: 'unlimited',
            max_users: 'unlimited',
            max_satellite_reports: 'unlimited',
            has_analytics: 'true',
            has_sensor_integration: 'true',
            has_ai_recommendations: 'true',
            has_advanced_reporting: 'true',
            has_api_access: 'true',
            has_priority_support: 'true',
            available_modules: '*',
            contact_sales: 'true',
        },
        is_highlighted: false,
    },
];
function createOrUpdateProducts() {
    return __awaiter(this, void 0, void 0, function () {
        var existingProducts, response, error_1, processedProducts, _loop_1, _i, products_1, product;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('🚀 Setting up Polar.sh products...\n');
                    console.log("Organization ID: ".concat(POLAR_ORGANIZATION_ID, "\n"));
                    // First, fetch existing products
                    console.log('📋 Fetching existing products...\n');
                    existingProducts = [];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, polar.products.list({
                            organizationId: POLAR_ORGANIZATION_ID,
                        })];
                case 2:
                    response = _c.sent();
                    existingProducts = ((_a = response.result) === null || _a === void 0 ? void 0 : _a.items) || [];
                    console.log("   Found ".concat(existingProducts.length, " existing product(s)\n"));
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    console.error("\u26A0\uFE0F  Failed to fetch existing products: ".concat(error_1.message, "\n"));
                    return [3 /*break*/, 4];
                case 4:
                    processedProducts = [];
                    _loop_1 = function (product) {
                        var existing, productResponse, existingPrices, pricesResponse, error_2, _loop_2, _d, _e, priceData, error_3;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0:
                                    _f.trys.push([0, 15, , 16]);
                                    existing = existingProducts.find(function (p) {
                                        var _a;
                                        return p.name === product.name ||
                                            ((_a = p.metadata) === null || _a === void 0 ? void 0 : _a.plan_type) === product.metadata.plan_type;
                                    });
                                    productResponse = void 0;
                                    if (!existing) return [3 /*break*/, 2];
                                    console.log("\uD83D\uDD04 Updating existing product: ".concat(product.name, " (").concat(existing.id, ")"));
                                    return [4 /*yield*/, polar.products.update({
                                            id: existing.id,
                                            name: product.name,
                                            description: product.description,
                                            metadata: product.metadata,
                                            isHighlighted: product.is_highlighted,
                                        })];
                                case 1:
                                    productResponse = _f.sent();
                                    console.log("   \u2705 Product updated");
                                    return [3 /*break*/, 4];
                                case 2:
                                    console.log("\uD83D\uDCE6 Creating new product: ".concat(product.name));
                                    return [4 /*yield*/, polar.products.create({
                                            organizationId: POLAR_ORGANIZATION_ID,
                                            name: product.name,
                                            description: product.description,
                                            metadata: product.metadata,
                                            isHighlighted: product.is_highlighted,
                                        })];
                                case 3:
                                    productResponse = _f.sent();
                                    console.log("   \u2705 Product created with ID: ".concat(productResponse.id));
                                    _f.label = 4;
                                case 4:
                                    if (!(product.prices.length > 0)) return [3 /*break*/, 13];
                                    existingPrices = [];
                                    _f.label = 5;
                                case 5:
                                    _f.trys.push([5, 7, , 8]);
                                    return [4 /*yield*/, polar.products.listPrices({
                                            productId: productResponse.id,
                                        })];
                                case 6:
                                    pricesResponse = _f.sent();
                                    existingPrices = ((_b = pricesResponse.result) === null || _b === void 0 ? void 0 : _b.items) || [];
                                    return [3 /*break*/, 8];
                                case 7:
                                    error_2 = _f.sent();
                                    console.log("   \u26A0\uFE0F  Could not fetch prices: ".concat(error_2.message));
                                    return [3 /*break*/, 8];
                                case 8:
                                    _loop_2 = function (priceData) {
                                        var existingPrice, error_4;
                                        return __generator(this, function (_g) {
                                            switch (_g.label) {
                                                case 0:
                                                    _g.trys.push([0, 4, , 5]);
                                                    existingPrice = existingPrices.find(function (p) {
                                                        return p.priceAmount === priceData.amount &&
                                                            p.priceCurrency === priceData.currency &&
                                                            p.recurringInterval === priceData.recurring_interval;
                                                    });
                                                    if (!existingPrice) return [3 /*break*/, 1];
                                                    console.log("   \uD83D\uDCB0 Price already exists: $".concat((priceData.amount / 100).toFixed(2), " ").concat(priceData.currency, "/").concat(priceData.recurring_interval));
                                                    return [3 /*break*/, 3];
                                                case 1: return [4 /*yield*/, polar.products.createPrice({
                                                        productId: productResponse.id,
                                                        amountType: 'fixed',
                                                        priceAmount: priceData.amount,
                                                        priceCurrency: priceData.currency,
                                                        recurringInterval: priceData.recurring_interval,
                                                    })];
                                                case 2:
                                                    _g.sent();
                                                    console.log("   \uD83D\uDCB0 Price created: $".concat((priceData.amount / 100).toFixed(2), " ").concat(priceData.currency, "/").concat(priceData.recurring_interval));
                                                    _g.label = 3;
                                                case 3: return [3 /*break*/, 5];
                                                case 4:
                                                    error_4 = _g.sent();
                                                    console.error("   \u274C Failed to handle price: ".concat(error_4.message));
                                                    return [3 /*break*/, 5];
                                                case 5: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _d = 0, _e = product.prices;
                                    _f.label = 9;
                                case 9:
                                    if (!(_d < _e.length)) return [3 /*break*/, 12];
                                    priceData = _e[_d];
                                    return [5 /*yield**/, _loop_2(priceData)];
                                case 10:
                                    _f.sent();
                                    _f.label = 11;
                                case 11:
                                    _d++;
                                    return [3 /*break*/, 9];
                                case 12: return [3 /*break*/, 14];
                                case 13:
                                    console.log("   \uD83D\uDCBC Contact sales - no fixed pricing");
                                    _f.label = 14;
                                case 14:
                                    processedProducts.push({
                                        name: product.name,
                                        id: productResponse.id,
                                        plan_type: product.metadata.plan_type,
                                    });
                                    console.log('');
                                    return [3 /*break*/, 16];
                                case 15:
                                    error_3 = _f.sent();
                                    console.error("\u274C Failed to process ".concat(product.name, ":"));
                                    console.error("   ".concat(error_3.message, "\n"));
                                    return [3 /*break*/, 16];
                                case 16: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, products_1 = products;
                    _c.label = 5;
                case 5:
                    if (!(_i < products_1.length)) return [3 /*break*/, 8];
                    product = products_1[_i];
                    return [5 /*yield**/, _loop_1(product)];
                case 6:
                    _c.sent();
                    _c.label = 7;
                case 7:
                    _i++;
                    return [3 /*break*/, 5];
                case 8:
                    console.log('\n✨ Setup complete!\n');
                    if (processedProducts.length > 0) {
                        console.log('📋 Processed Products Summary:\n');
                        processedProducts.forEach(function (p) {
                            console.log("   \u2022 ".concat(p.name, " (").concat(p.plan_type, ")"));
                            console.log("     ID: ".concat(p.id, "\n"));
                        });
                        console.log('\n📝 Next Steps:\n');
                        console.log('1. Go to Polar.sh dashboard to verify products');
                        console.log('2. Configure webhook endpoint (see WEBHOOK_SETUP.md)');
                        console.log('3. Test subscription flow in your app');
                        console.log('4. Visit: http://localhost:5173/settings/subscription\n');
                    }
                    return [2 /*return*/];
            }
        });
    });
}
createOrUpdateProducts().catch(function (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
