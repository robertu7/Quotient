CREATE TRIGGER allocations_insert_guard
BEFORE INSERT ON allocations
BEGIN
  SELECT CASE
    WHEN NEW.quantity <= 0 THEN RAISE(ABORT, 'allocation quantity must be positive')
    WHEN NEW.quantity > (
      SELECT dl.quantity - COALESCE((SELECT SUM(a.quantity) FROM allocations a WHERE a.quotation_line_id = dl.id), 0)
      FROM document_lines dl
      JOIN documents d ON d.id = dl.document_id
      WHERE dl.id = NEW.quotation_line_id AND d.type = 'quotation' AND d.lifecycle = 'issued' AND d.quotation_response = 'accepted'
    ) THEN RAISE(ABORT, 'allocation exceeds remaining quotation quantity')
  END;
END;
--> statement-breakpoint

CREATE TRIGGER allocations_update_guard
BEFORE UPDATE OF quantity ON allocations
BEGIN
  SELECT CASE
    WHEN NEW.quantity <= 0 THEN RAISE(ABORT, 'allocation quantity must be positive')
    WHEN NEW.quantity > (
      SELECT dl.quantity - COALESCE((SELECT SUM(a.quantity) FROM allocations a WHERE a.quotation_line_id = dl.id AND a.id <> OLD.id), 0)
      FROM document_lines dl
      JOIN documents d ON d.id = dl.document_id
      WHERE dl.id = NEW.quotation_line_id AND d.type = 'quotation' AND d.lifecycle = 'issued'
    ) THEN RAISE(ABORT, 'allocation exceeds remaining quotation quantity')
  END;
END;
--> statement-breakpoint

CREATE TRIGGER quotation_line_quantity_guard
BEFORE UPDATE OF quantity ON document_lines
WHEN NEW.quantity < COALESCE((SELECT SUM(a.quantity) FROM allocations a WHERE a.quotation_line_id = OLD.id), 0)
BEGIN
  SELECT RAISE(ABORT, 'quotation line quantity is below allocated quantity');
END;
--> statement-breakpoint

CREATE TRIGGER payments_insert_guard
BEFORE INSERT ON payments
BEGIN
  SELECT CASE
    WHEN NEW.amount_minor <= 0 THEN RAISE(ABORT, 'payment amount must be positive')
    WHEN NEW.amount_minor + COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.invoice_id = NEW.invoice_id), 0) >
      COALESCE((SELECT SUM(ROUND(dl.quantity * dl.unit_price_minor / 10000.0)) FROM document_lines dl WHERE dl.document_id = NEW.invoice_id), 0)
      THEN RAISE(ABORT, 'payments exceed invoice total')
  END;
END;
--> statement-breakpoint

CREATE TRIGGER payments_update_guard
BEFORE UPDATE OF amount_minor, invoice_id ON payments
BEGIN
  SELECT CASE
    WHEN NEW.amount_minor <= 0 THEN RAISE(ABORT, 'payment amount must be positive')
    WHEN NEW.amount_minor + COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.invoice_id = NEW.invoice_id AND p.id <> OLD.id), 0) >
      COALESCE((SELECT SUM(ROUND(dl.quantity * dl.unit_price_minor / 10000.0)) FROM document_lines dl WHERE dl.document_id = NEW.invoice_id), 0)
      THEN RAISE(ABORT, 'payments exceed invoice total')
  END;
END;
--> statement-breakpoint

CREATE TRIGGER invoice_total_payment_guard
BEFORE UPDATE OF quantity, unit_price_minor ON document_lines
WHEN (SELECT type FROM documents WHERE id = NEW.document_id) = 'invoice'
  AND COALESCE((SELECT SUM(p.amount_minor) FROM payments p WHERE p.invoice_id = NEW.document_id), 0) >
    COALESCE((SELECT SUM(ROUND(CASE WHEN dl.id = NEW.id THEN NEW.quantity ELSE dl.quantity END * CASE WHEN dl.id = NEW.id THEN NEW.unit_price_minor ELSE dl.unit_price_minor END / 10000.0)) FROM document_lines dl WHERE dl.document_id = NEW.document_id), 0)
BEGIN
  SELECT RAISE(ABORT, 'invoice total cannot be lower than recorded payments');
END;
--> statement-breakpoint

CREATE TRIGGER paid_invoice_void_guard
BEFORE UPDATE OF lifecycle ON documents
WHEN NEW.lifecycle = 'void' AND EXISTS (SELECT 1 FROM payments p WHERE p.invoice_id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'remove payments before voiding invoice');
END;
