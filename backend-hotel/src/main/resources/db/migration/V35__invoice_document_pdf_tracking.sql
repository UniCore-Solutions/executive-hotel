-- V35: server-side PDF generation tracking for invoices and credit notes.
--
-- pdf_storage_key + pdf_generated_at are the whole generation-state signal:
-- NULL means "not generated yet" (or generation failed and never persisted a
-- key); non-NULL means a PDF was stored under that key at that time. The
-- download endpoint treats a non-NULL key whose file is missing on disk as
-- "regenerate" rather than introducing a separate status column.

ALTER TABLE invoices ADD COLUMN pdf_storage_key VARCHAR(255);
ALTER TABLE invoices ADD COLUMN pdf_generated_at TIMESTAMPTZ;

ALTER TABLE credit_notes ADD COLUMN pdf_storage_key VARCHAR(255);
ALTER TABLE credit_notes ADD COLUMN pdf_generated_at TIMESTAMPTZ;
