CREATE TRIGGER allocated_quotation_void_guard
BEFORE UPDATE OF lifecycle ON documents
WHEN NEW.lifecycle = 'void' AND NEW.type = 'quotation' AND EXISTS (
  SELECT 1 FROM allocations a JOIN document_lines dl ON dl.id = a.quotation_line_id WHERE dl.document_id = NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'release invoice allocations before voiding quotation');
END;
