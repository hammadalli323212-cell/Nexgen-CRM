-- Add new columns for tracking payment terms and methods
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS carrier_pay_terms TEXT,
ADD COLUMN IF NOT EXISTS carrier_payment_method TEXT,
ADD COLUMN IF NOT EXISTS broker_fee_terms TEXT,
ADD COLUMN IF NOT EXISTS broker_fee_paid_by TEXT DEFAULT 'Customer';
