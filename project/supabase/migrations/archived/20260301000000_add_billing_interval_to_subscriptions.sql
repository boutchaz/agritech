-- Add billing_interval column to subscriptions table
-- This column stores the billing interval (monthly, yearly) for the subscription

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(20) DEFAULT 'monthly';

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.billing_interval IS 'Billing interval for the subscription: monthly or yearly';
