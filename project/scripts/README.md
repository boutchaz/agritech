# Polar.sh Setup Scripts

## Create Products Automatically

This script creates all three subscription products in your Polar.sh organization.

### Prerequisites

1. **Polar.sh Account**: Create account at https://polar.sh
2. **Organization Created**: Set up your organization in Polar.sh
3. **API Token**: Get from Settings → API Keys (needs product creation permission)
4. **Environment Variables**: Add to `.env`:
   ```
   VITE_POLAR_ACCESS_TOKEN=polar_at_xxxxxxxxxxxxx
   VITE_POLAR_ORGANIZATION_ID=org_xxxxxxxxxxxxx
   ```

### Run the Script

```bash
# From project root
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Run the setup script
node scripts/setup-polar-products.js
```

### What It Creates

The script will create:

1. **Essential Plan** - $25/month
   - Product with metadata: `plan_type: essential`
   - Price: $25.00 USD/month
   - Limits: 2 farms, 25 parcels, 5 users

2. **Professional Plan** - $75/month
   - Product with metadata: `plan_type: professional`
   - Price: $75.00 USD/month
   - Limits: 10 farms, 200 parcels, 25 users
   - Features: Analytics, sensors, AI
   - Marked as "highlighted" (most popular)

3. **Agri-Business Plan** - Contact Sales
   - Product with metadata: `plan_type: enterprise`
   - No fixed price (contact sales)
   - Unlimited everything

### Script Output

```
🚀 Creating Polar.sh products...

Organization ID: org_xxxxxxxxxxxxx

📦 Creating: Essential Plan
   ✅ Product created with ID: prod_xxxxxxxxxxxxx
   💰 Price created: $25.00 USD/month

📦 Creating: Professional Plan
   ✅ Product created with ID: prod_xxxxxxxxxxxxx
   💰 Price created: $75.00 USD/month

📦 Creating: Agri-Business Plan
   ✅ Product created with ID: prod_xxxxxxxxxxxxx
   💼 Contact sales - no fixed pricing

✨ Setup complete!

📋 Created Products Summary:

   • Essential Plan (essential)
     ID: prod_xxxxxxxxxxxxx

   • Professional Plan (professional)
     ID: prod_xxxxxxxxxxxxx

   • Agri-Business Plan (enterprise)
     ID: prod_xxxxxxxxxxxxx

📝 Next Steps:

1. Go to Polar.sh dashboard to verify products
2. Configure webhook endpoint (see WEBHOOK_SETUP.md)
3. Test subscription flow in your app
4. Visit: http://localhost:5173/settings/subscription
```

### Verify in Polar.sh Dashboard

1. Go to https://polar.sh/dashboard
2. Navigate to **Products** section
3. You should see all three products listed
4. Click each to verify:
   - Correct pricing
   - Metadata includes `plan_type`
   - Description is set

### Troubleshooting

**"Missing required environment variables"**
- Check your `.env` file has `VITE_POLAR_ACCESS_TOKEN` and `VITE_POLAR_ORGANIZATION_ID`
- Values should start with `polar_at_` and `org_` respectively

**"401 Unauthorized"**
- API token is invalid or expired
- Generate new token in Polar.sh Settings → API Keys
- Make sure token has "Create Products" permission

**"Failed to create product"**
- Product with same name might already exist
- Check Polar.sh dashboard and delete duplicates
- Or modify product names in the script

**"Failed to create price"**
- Product was created but pricing failed
- You can add prices manually in Polar.sh dashboard
- Or run script again (it will skip existing products)

### Customizing Products

Edit `scripts/setup-polar-products.js` to customize:

```javascript
const products = [
  {
    name: 'Your Plan Name',
    description: 'Your description',
    price_amount: 2500, // Price in cents ($25.00)
    metadata: {
      plan_type: 'your_type',
      // Add custom metadata
    },
  },
];
```

### Alternative: Manual Creation

If you prefer to create products manually:

1. Go to Polar.sh Dashboard → Products
2. Click "Create Product"
3. Fill in details for each plan
4. **Important**: Add metadata `plan_type` to each:
   - Essential: `{"plan_type": "essential"}`
   - Professional: `{"plan_type": "professional"}`
   - Enterprise: `{"plan_type": "enterprise"}`

The metadata is crucial for the webhook to work correctly!

### Next Steps After Running Script

1. ✅ Products created in Polar.sh
2. ⏭️ Configure webhook (see WEBHOOK_SETUP.md)
3. ⏭️ Test subscription page: http://localhost:5173/settings/subscription
4. ⏭️ Apply database migration (see TESTING_SUBSCRIPTION.md)
5. ⏭️ Test full checkout flow
