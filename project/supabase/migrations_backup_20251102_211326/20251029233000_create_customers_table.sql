-- Migration: Create Customers Table
-- Date: 2025-10-29
-- Description: Creates customers table for managing sales invoice parties

-- ============================================================================
-- Create customers table (similar to suppliers but for sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Basic Information
  name VARCHAR(255) NOT NULL,
  customer_code VARCHAR(50), -- Optional customer reference code
  contact_person VARCHAR(255),

  -- Contact Details
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),

  -- Address
  address TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Morocco',

  -- Business Information
  website VARCHAR(255),
  tax_id VARCHAR(100), -- Tax identification number (ICE in Morocco)

  -- Financial Terms
  payment_terms VARCHAR(100), -- e.g., "Net 30", "Cash on Delivery", "Net 15"
  credit_limit DECIMAL(15,2), -- Maximum outstanding credit allowed
  currency_code VARCHAR(3) DEFAULT 'MAD',

  -- Customer Classification
  customer_type VARCHAR(50), -- e.g., "Retail", "Wholesale", "Distributor"
  price_list VARCHAR(100), -- Reference to price list if applicable

  -- Relationship Management
  assigned_to UUID REFERENCES auth.users(id), -- Sales person assigned
  notes TEXT,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_customers_organization
  ON public.customers(organization_id);

CREATE INDEX IF NOT EXISTS idx_customers_name
  ON public.customers(organization_id, name);

CREATE INDEX IF NOT EXISTS idx_customers_active
  ON public.customers(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_customers_code
  ON public.customers(organization_id, customer_code)
  WHERE customer_code IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Users can view customers in their organization
CREATE POLICY customers_select_policy ON public.customers
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert customers in their organization
CREATE POLICY customers_insert_policy ON public.customers
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can update customers in their organization
CREATE POLICY customers_update_policy ON public.customers
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Users can delete customers in their organization
CREATE POLICY customers_delete_policy ON public.customers
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE public.customers IS 'Customer records for sales invoices and revenue tracking';
COMMENT ON COLUMN public.customers.customer_code IS 'Optional customer reference code for internal use';
COMMENT ON COLUMN public.customers.payment_terms IS 'Default payment terms for this customer (e.g., Net 30)';
COMMENT ON COLUMN public.customers.credit_limit IS 'Maximum outstanding credit allowed for this customer';
COMMENT ON COLUMN public.customers.customer_type IS 'Classification: Retail, Wholesale, Distributor, etc.';
COMMENT ON COLUMN public.customers.assigned_to IS 'Sales person or account manager assigned to this customer';
