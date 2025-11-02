-- Migration: Fix Accounting Schema Mismatches - Part 1: Add ENUM values
-- Date: 2025-10-29
-- Description: Adds new enum values to accounting_payment_type
-- Must be in separate transaction from using the values

-- ============================================================================
-- Add new enum values to accounting_payment_type
-- ============================================================================

ALTER TYPE accounting_payment_type ADD VALUE IF NOT EXISTS 'received';
ALTER TYPE accounting_payment_type ADD VALUE IF NOT EXISTS 'paid';
