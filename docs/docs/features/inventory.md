# Inventory Management

## Overview

The Inventory Management module provides comprehensive stock tracking for agricultural inputs including seeds, fertilizers, pesticides, and other farm supplies. It features automatic product creation during purchases, flexible packaging type support, supplier management, and invoice upload capabilities.

## Key Features

### Stock Management

Complete inventory control system:

- **Real-time Stock Levels** - Current quantities across all warehouses
- **Multi-warehouse Support** - Track stock by location
- **Stock Movements** - Record additions, withdrawals, transfers
- **Low Stock Alerts** - Automatic warnings when stock falls below threshold
- **Expiration Tracking** - Monitor product expiry dates
- **Batch/Lot Tracking** - Track products by batch number
- **Stock Valuation** - FIFO, LIFO, or weighted average costing
- **Stock History** - Complete audit trail of all movements

### Auto-Product Creation

Streamlined product management:

- **Purchase-based Creation** - Products automatically created when entered in purchase orders
- **Duplicate Prevention** - Smart matching prevents duplicate products
- **Default Values** - Sensible defaults for new products (unit, category)
- **Quick Edit** - Easily update auto-created product details
- **Category Assignment** - Automatic categorization based on product type
- **Supplier Linking** - Products linked to suppliers automatically

### Packaging Types

Support for various agricultural packaging:

#### Liquid Products (bidons/containers)
- 5L bidons
- 10L bidons
- 20L bidons
- 200L barrels
- 1000L IBC tanks

#### Solid Products (sacs/bags)
- 25kg sacs
- 50kg sacs
- 1000kg big bags
- Custom sizes

#### Unit Products
- Individual items (equipment, tools)
- Counted pieces (seed packets)

#### Custom Packaging
- Define custom units and conversions
- Mixed packaging (e.g., "box of 12x1L bottles")

### Invoice Uploads

Document management for purchases:

- **PDF/Image Upload** - Store purchase invoices and receipts
- **Supabase Storage** - Secure cloud storage in `invoices` bucket
- **OCR Integration** - Extract data from scanned invoices (future)
- **Invoice Linking** - Link invoices to purchase records
- **Multi-file Support** - Multiple documents per purchase
- **Preview** - View uploaded invoices in-app
- **Download** - Download original invoice files

### Supplier Management

Track relationships with suppliers:

- **Supplier Directory** - Complete contact information
- **Purchase History** - All purchases from each supplier
- **Payment Terms** - Credit terms and payment schedules
- **Supplier Rating** - Quality and reliability ratings
- **Contact Management** - Multiple contacts per supplier
- **Price Tracking** - Historical prices from each supplier
- **Preferred Suppliers** - Mark favorite suppliers for products

### Warehouse Management

Multiple storage location support:

- **Warehouse Locations** - Define multiple storage facilities
- **Location Hierarchy** - Warehouses → Sections → Bins
- **Stock by Location** - Track quantities at each location
- **Inter-warehouse Transfers** - Move stock between warehouses
- **Capacity Management** - Track warehouse capacity and utilization
- **Location Barcoding** - Barcode scanning for accuracy (future)

## User Interface

### Stock List View (`/stock`)

The main inventory interface provides:

1. **Stock Table**
   - Product name and code
   - Category and subcategory
   - Current quantity and unit
   - Unit price and total value
   - Warehouse location
   - Last updated date
   - Stock status indicator (in-stock, low-stock, out-of-stock)
   - Quick actions (adjust, transfer, order)

2. **Filter and Search Panel**
   - Search by product name or code
   - Filter by category
   - Filter by warehouse
   - Filter by stock status
   - Filter by supplier
   - Sort by name, quantity, value, date

3. **Summary Cards**
   - Total inventory value
   - Number of products
   - Low stock items count
   - Out of stock items count
   - Expiring soon count

4. **Action Buttons**
   - Add new product
   - Record purchase
   - Record usage/withdrawal
   - Transfer stock
   - Generate stock report

### Product Detail View

Detailed product information:

1. **Product Information**
   - Product name and code
   - Category and subcategory
   - Description
   - Manufacturer/brand
   - Unit of measurement
   - Packaging type and size
   - Minimum stock level
   - Reorder point and quantity

2. **Stock Summary**
   - Total quantity across all warehouses
   - Stock by warehouse breakdown
   - Available vs reserved quantity
   - Average monthly usage
   - Days of stock remaining
   - Reorder suggestion

3. **Pricing Information**
   - Current unit price
   - Last purchase price
   - Average purchase price
   - Price trend chart
   - Cost per hectare/acre calculations

4. **Movement History**
   - Recent stock movements (in/out)
   - Purchase history
   - Usage history
   - Transfer history
   - Adjustment history

5. **Supplier Information**
   - Preferred supplier
   - Alternative suppliers
   - Supplier product codes
   - Lead times
   - Minimum order quantities

### Purchase Entry Form

Record new purchases:

1. **Purchase Header**
   ```typescript
   {
     purchase_date: "2024-10-25",
     supplier_id: "uuid",
     invoice_number: "INV-2024-1025",
     payment_status: "paid",
     payment_method: "bank_transfer",
     warehouse_id: "uuid",
     total_amount: 1500.00
   }
   ```

2. **Purchase Items** (can add multiple)
   ```typescript
   {
     product_name: "Nitrogen Fertilizer (20-5-10)", // Auto-creates if new
     quantity: 10,
     unit: "sac",
     packaging_size: "50kg",
     unit_price: 45.00,
     total_price: 450.00,
     batch_number: "BATCH-2024-Q4",
     expiry_date: "2026-10-31"
   }
   ```

3. **Invoice Upload**
   - Drag and drop or click to upload
   - Supports PDF, JPG, PNG
   - Max 10MB per file
   - Multiple files allowed
   - Preview before saving

4. **Payment Details**
   - Payment date
   - Payment method (cash, check, bank transfer, credit)
   - Payment reference number
   - Payment account (if bank transfer)
   - Link to accounting payment record

### Stock Adjustment Form

Record stock corrections:

- **Adjustment Type** - Increase, decrease, or count correction
- **Reason** - Damage, expiry, theft, inventory count, other
- **Quantity** - Amount to adjust
- **Notes** - Explanation of adjustment
- **Photo Upload** - Evidence for adjustment
- **Approval** - Requires manager approval for large adjustments

### Stock Transfer Form

Move stock between warehouses:

- **From Warehouse** - Source location
- **To Warehouse** - Destination location
- **Products** - Select products and quantities
- **Transfer Date** - When transfer occurs
- **Carrier** - Transportation method/company
- **Notes** - Special instructions
- **Status** - Pending, in-transit, completed

## Usage Guide

### Adding a New Product Manually

1. Navigate to `/stock`
2. Click "Add Product" button
3. Fill in product details:
   ```typescript
   {
     name: "Premium Wheat Seeds - Variety XYZ",
     code: "SEED-WHEAT-XYZ",
     category: "Seeds",
     subcategory: "Wheat",
     unit: "kg",
     packaging_type: "sac",
     packaging_size: "25kg",
     min_stock_level: 100,
     reorder_point: 150,
     reorder_quantity: 500
   }
   ```
4. Click "Create Product"
5. Product now available for purchases and usage

### Recording a Purchase

1. Navigate to `/stock`
2. Click "Record Purchase" button
3. Select supplier from dropdown (or create new)
4. Enter purchase details:
   - Purchase date
   - Invoice number
   - Payment status
   - Warehouse destination
5. Add purchase items:
   - Type product name (autocomplete suggests existing)
   - If new product, it will be auto-created
   - Enter quantity and unit price
   - Add batch/expiry if applicable
6. Upload invoice PDF/image
7. Click "Save Purchase"
8. Stock levels automatically updated

### Recording Stock Usage

When materials are used (e.g., for a task):

1. Navigate to `/stock`
2. Click on product to open detail view
3. Click "Record Usage" button
4. Fill usage form:
   ```typescript
   {
     quantity: 50, // kg
     usage_date: "2024-10-25",
     usage_type: "task", // or "waste", "transfer", "sale"
     task_id: "uuid", // Link to task
     parcel_id: "uuid", // Where used
     notes: "Fertilizer application on North Field"
   }
   ```
5. System automatically:
   - Deducts quantity from stock
   - Updates task material costs
   - Records movement in history
   - Checks if reorder needed

### Managing Low Stock

When stock falls below minimum level:

1. System displays "Low Stock" badge on product
2. Dashboard shows "Low Stock Alert" notification
3. Click alert to see all low stock items
4. For each item:
   - View current quantity
   - See recommended reorder quantity
   - Click "Create Purchase Order" (future feature)
   - Or manually contact supplier
5. Record purchase when stock arrives

### Transferring Stock Between Warehouses

1. Navigate to `/stock`
2. Click "Transfer Stock" button
3. Select source and destination warehouses
4. Add products to transfer:
   - Select product
   - Enter quantity
   - Verify availability in source warehouse
5. Set transfer date and carrier
6. Click "Initiate Transfer"
7. Status: "Pending" → "In Transit" → "Completed"
8. Upon completion:
   - Stock deducted from source
   - Stock added to destination
   - Both warehouses' records updated

### Uploading Purchase Invoices

To attach invoice documents:

1. During purchase entry, click "Upload Invoice"
2. Drag and drop PDF or image file
3. Or click "Browse Files" to select
4. System uploads to Supabase Storage
5. File name automatically includes:
   - Supplier name
   - Invoice number
   - Date
6. Preview uploaded invoice in purchase detail
7. Download original file anytime

### Running Stock Reports

Generate inventory reports:

1. Navigate to `/stock` or `/reports`
2. Select report type:
   - **Stock Summary** - Current quantities and values
   - **Stock Movement** - Ins and outs for date range
   - **Low Stock Report** - Items below minimum
   - **Expiry Report** - Items expiring soon
   - **Stock Valuation** - Total inventory value
   - **Usage Analysis** - Consumption patterns
3. Set parameters (date range, warehouse, category)
4. Click "Generate Report"
5. View in browser or export to:
   - PDF (printable)
   - Excel (editable)
   - CSV (data analysis)

## API Integration

### Database Schema

**Inventory Table:**
```sql
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),

  -- Product Information
  name TEXT NOT NULL,
  code TEXT, -- SKU or product code
  description TEXT,
  category TEXT NOT NULL, -- Seeds, Fertilizers, Pesticides, etc.
  subcategory TEXT,
  manufacturer TEXT,
  brand TEXT,

  -- Packaging
  unit TEXT NOT NULL, -- kg, L, pieces, etc.
  packaging_type TEXT, -- bidon, sac, barrel, box, etc.
  packaging_size TEXT, -- "50kg", "10L", etc.

  -- Stock Levels
  quantity NUMERIC DEFAULT 0,
  reserved_quantity NUMERIC DEFAULT 0, -- Allocated to tasks
  available_quantity NUMERIC GENERATED ALWAYS AS
    (quantity - COALESCE(reserved_quantity, 0)) STORED,
  min_stock_level NUMERIC DEFAULT 0,
  reorder_point NUMERIC,
  reorder_quantity NUMERIC,

  -- Pricing
  unit_price NUMERIC,
  last_purchase_price NUMERIC,
  average_purchase_price NUMERIC,
  total_value NUMERIC GENERATED ALWAYS AS
    (quantity * COALESCE(unit_price, 0)) STORED,

  -- Tracking
  batch_number TEXT,
  expiry_date DATE,
  last_restocked_date DATE,
  last_usage_date DATE,

  -- Supplier
  preferred_supplier_id UUID REFERENCES suppliers(id),

  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);

CREATE INDEX idx_inventory_org_warehouse ON inventory(organization_id, warehouse_id);
CREATE INDEX idx_inventory_category ON inventory(category, subcategory);
CREATE INDEX idx_inventory_expiry ON inventory(expiry_date) WHERE expiry_date IS NOT NULL;
```

**Purchases Table:**
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  warehouse_id UUID REFERENCES warehouses(id),

  purchase_date DATE NOT NULL,
  invoice_number TEXT,
  invoice_file_url TEXT, -- Supabase Storage URL

  payment_status TEXT DEFAULT 'unpaid', -- unpaid, partial, paid
  payment_method TEXT, -- cash, check, bank_transfer, credit
  payment_date DATE,
  payment_reference TEXT,

  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,

  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Purchase Items Table:**
```sql
CREATE TABLE purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory(id),

  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  packaging_type TEXT,
  packaging_size TEXT,

  unit_price NUMERIC NOT NULL,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,

  batch_number TEXT,
  expiry_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Stock Movements Table:**
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL, -- purchase, usage, adjustment, transfer_in, transfer_out
  movement_date DATE NOT NULL,

  quantity NUMERIC NOT NULL, -- Positive for in, negative for out
  previous_quantity NUMERIC,
  new_quantity NUMERIC,

  -- References
  purchase_id UUID REFERENCES purchases(id),
  task_id UUID REFERENCES tasks(id),
  transfer_id UUID REFERENCES stock_transfers(id),

  -- Details
  reason TEXT,
  notes TEXT,

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_item ON stock_movements(inventory_item_id, movement_date DESC);
```

**Suppliers Table:**
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,

  payment_terms TEXT, -- "Net 30", "COD", etc.
  credit_limit NUMERIC,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),

  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);
```

**Warehouses Table:**
```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id),

  name TEXT NOT NULL,
  code TEXT,
  type TEXT, -- main, satellite, cold_storage, etc.
  location TEXT,
  address TEXT,
  capacity NUMERIC, -- In cubic meters or other unit
  capacity_unit TEXT DEFAULT 'm3',

  manager_id UUID REFERENCES workers(id),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### TanStack Query Hooks

```typescript
// Fetch inventory with filters
const useInventory = (organizationId: string, filters?: InventoryFilters) => {
  return useQuery({
    queryKey: ['inventory', organizationId, filters],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select(`
          *,
          warehouses(name),
          suppliers(name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (filters?.category) query = query.eq('category', filters.category);
      if (filters?.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
      if (filters?.low_stock) query = query.lt('quantity', supabase.raw('min_stock_level'));

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Create purchase with auto-product creation
const useCreatePurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchase: CreatePurchaseInput) => {
      const { items, invoice_file, ...purchaseData } = purchase;

      // Upload invoice file if provided
      let invoice_file_url = null;
      if (invoice_file) {
        const fileName = `invoices/${organizationId}/${Date.now()}_${invoice_file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(fileName, invoice_file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('invoices')
          .getPublicUrl(uploadData.path);

        invoice_file_url = urlData.publicUrl;
      }

      // Create purchase record
      const { data: createdPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          ...purchaseData,
          invoice_file_url,
          organization_id: organizationId
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Process purchase items and auto-create products
      for (const item of items) {
        // Check if product exists
        const { data: existingProduct } = await supabase
          .from('inventory')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('name', item.product_name)
          .single();

        let inventory_item_id = existingProduct?.id;

        // Auto-create product if doesn't exist
        if (!inventory_item_id) {
          const { data: newProduct, error: productError } = await supabase
            .from('inventory')
            .insert({
              organization_id: organizationId,
              name: item.product_name,
              category: item.category || 'Other',
              unit: item.unit,
              packaging_type: item.packaging_type,
              packaging_size: item.packaging_size,
              warehouse_id: purchaseData.warehouse_id,
              quantity: 0, // Will be updated by stock movement
              unit_price: item.unit_price,
              preferred_supplier_id: purchaseData.supplier_id
            })
            .select()
            .single();

          if (productError) throw productError;
          inventory_item_id = newProduct.id;
        }

        // Create purchase item
        await supabase
          .from('purchase_items')
          .insert({
            purchase_id: createdPurchase.id,
            inventory_item_id,
            ...item
          });

        // Update stock quantity
        await supabase.rpc('update_inventory_quantity', {
          p_inventory_item_id: inventory_item_id,
          p_quantity_change: item.quantity,
          p_purchase_id: createdPurchase.id
        });
      }

      return createdPurchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase recorded successfully');
    }
  });
};
```

## Code Examples

### Purchase Entry with Auto-Product Creation

```typescript
import { useCreatePurchase } from '@/hooks/useInventory';
import { useForm, useFieldArray } from 'react-hook-form';

const PurchaseEntryForm = () => {
  const createPurchase = useCreatePurchase();

  const form = useForm({
    defaultValues: {
      purchase_date: new Date(),
      supplier_id: '',
      warehouse_id: '',
      items: [{ product_name: '', quantity: 0, unit: '', unit_price: 0 }],
      invoice_file: null
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const onSubmit = (data) => {
    createPurchase.mutate({
      ...data,
      organization_id: currentOrganization.id,
      created_by: user.id
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Purchase Header */}
      <FormField control={form.control} name="supplier_id"
        render={({ field }) => (
          <SupplierSelect {...field} />
        )}
      />

      {/* Purchase Items */}
      {fields.map((field, index) => (
        <div key={field.id} className="purchase-item">
          <FormField
            control={form.control}
            name={`items.${index}.product_name`}
            render={({ field }) => (
              <Autocomplete
                {...field}
                options={existingProducts}
                freeSolo // Allow new product names
                label="Product Name"
              />
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.quantity`}
            render={({ field }) => (
              <Input {...field} type="number" label="Quantity" />
            )}
          />

          <FormField
            control={form.control}
            name={`items.${index}.packaging_type`}
            render={({ field }) => (
              <Select {...field} label="Packaging">
                <option value="sac">Sac</option>
                <option value="bidon">Bidon</option>
                <option value="barrel">Barrel</option>
              </Select>
            )}
          />

          <Button onClick={() => remove(index)} variant="destructive">
            Remove
          </Button>
        </div>
      ))}

      <Button onClick={() => append({ product_name: '', quantity: 0 })}>
        Add Item
      </Button>

      {/* Invoice Upload */}
      <FormField
        control={form.control}
        name="invoice_file"
        render={({ field }) => (
          <FileUpload
            {...field}
            accept=".pdf,.jpg,.png"
            maxSize={10 * 1024 * 1024} // 10MB
          />
        )}
      />

      <Button type="submit" disabled={createPurchase.isPending}>
        Save Purchase
      </Button>
    </form>
  );
};
```

### Low Stock Alerts

```typescript
const LowStockAlerts = ({ organizationId }) => {
  const { data: lowStockItems } = useQuery({
    queryKey: ['inventory', 'low-stock', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('organization_id', organizationId)
        .lt('quantity', supabase.raw('min_stock_level'))
        .order('quantity');

      if (error) throw error;
      return data;
    },
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes
  });

  if (!lowStockItems || lowStockItems.length === 0) {
    return null;
  }

  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Low Stock Alert</AlertTitle>
      <AlertDescription>
        {lowStockItems.length} item(s) below minimum stock level:
        <ul className="mt-2 ml-4 list-disc">
          {lowStockItems.map(item => (
            <li key={item.id}>
              {item.name}: {item.quantity} {item.unit}
              (min: {item.min_stock_level})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};
```

## Best Practices

### Inventory Organization

1. **Consistent naming** - Use clear, descriptive product names
2. **Category structure** - Organize with main and subcategories
3. **Product codes** - Assign unique SKUs for tracking
4. **Regular audits** - Physical counts monthly or quarterly
5. **Clear documentation** - Attach invoices and receipts

### Stock Level Management

1. **Set realistic minimums** - Based on usage patterns
2. **Reorder points** - Account for lead times
3. **Safety stock** - Buffer for unexpected needs
4. **Seasonal adjustments** - Increase stocks before busy seasons
5. **Expiry monitoring** - FIFO (First In, First Out) principle

### Purchase Management

1. **Invoice filing** - Always attach purchase invoices
2. **Batch tracking** - Record batch numbers for traceability
3. **Price monitoring** - Track prices over time
4. **Supplier comparison** - Compare prices from multiple suppliers
5. **Payment tracking** - Monitor payment status and due dates

## Related Features

- [Task Management](./task-management.md) - Link inventory to task materials
- [Accounting](./accounting.md) - Purchase invoices and payments
- [Farm Management](./farm-management.md) - Warehouse locations on farms

## Troubleshooting

### Product Not Auto-Created

**Issue:** Product doesn't appear after purchase entry

**Solutions:**
- Verify auto-creation function is working
- Check product name doesn't already exist
- Ensure required fields provided
- Review server logs for errors
- Manually create product if needed

### Stock Quantity Mismatch

**Issue:** Physical count doesn't match system

**Solutions:**
- Review stock movement history
- Check for unrecorded usage
- Look for adjustment records
- Run stock reconciliation
- Create adjustment to correct

### Invoice Upload Fails

**Issue:** Cannot upload invoice file

**Solutions:**
- Check file size (&lt;10MB)
- Verify file format (PDF, JPG, PNG)
- Ensure Supabase Storage configured
- Check bucket permissions
- Verify internet connection

### Low Stock Alerts Not Working

**Issue:** Not receiving low stock notifications

**Solutions:**
- Verify min_stock_level set
- Check current quantity is below minimum
- Ensure is_active = true
- Review query logic
- Check notification settings
