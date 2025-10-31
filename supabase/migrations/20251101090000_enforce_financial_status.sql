-- Tighten invoice/payment status transitions to ensure ledger postings exist

CREATE OR REPLACE FUNCTION enforce_invoice_status_guard()
RETURNS trigger AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF jwt_role IS NOT NULL AND jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Invoice status changes require privileged context';
    END IF;

    IF NEW.status IN ('submitted', 'paid', 'partially_paid', 'overdue')
       AND NEW.journal_entry_id IS NULL THEN
      RAISE EXCEPTION 'Posting invoice status requires linked journal entry';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_payment_status_guard()
RETURNS trigger AS $$
DECLARE
  jwt_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF jwt_role IS NOT NULL AND jwt_role <> 'service_role' THEN
      RAISE EXCEPTION 'Payment status changes require privileged context';
    END IF;

    IF NEW.status = 'submitted' AND NEW.journal_entry_id IS NULL THEN
      RAISE EXCEPTION 'Posting payment status requires linked journal entry';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_invoice_status_guard ON invoices;
CREATE TRIGGER trg_enforce_invoice_status_guard
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION enforce_invoice_status_guard();

DROP TRIGGER IF EXISTS trg_enforce_payment_status_guard ON accounting_payments;
CREATE TRIGGER trg_enforce_payment_status_guard
BEFORE UPDATE ON accounting_payments
FOR EACH ROW
EXECUTE FUNCTION enforce_payment_status_guard();
