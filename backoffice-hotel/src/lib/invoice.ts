/** Render an invoice as a standalone, printable HTML document for download.
    No PDF library exists anywhere in this repo; a browser's own print
    dialog ("Save as PDF") already turns a clean printable page into one. */

export interface InvoiceItemData {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceDocData {
  invoiceNumber: string;
  billingName: string;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  feeAmount: number;
  totalAmount: number;
  issuedAt: string;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Whole amount, no cents — matches formatMoney (lib/format.ts) and the
// other two apps' invoice/credit-note downloads.
function money(n: number, currency: string): string {
  return `${currency} ${Math.round(n ?? 0).toLocaleString('en-US')}`;
}

export function buildInvoiceHtml(
  invoice: InvoiceDocData,
  items: InvoiceItemData[],
  hotelName: string = 'Executive Hotel'
): string {
  const rows = items
    .map(
      (it) => `<tr><td>${esc(it.description)}</td><td class="num">${it.quantity}</td>` +
        `<td class="num">${money(it.unitPrice, invoice.currencyCode)}</td>` +
        `<td class="num">${money(it.totalPrice, invoice.currencyCode)}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${esc(invoice.invoiceNumber)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #182420; max-width: 640px;
         margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #5c6b62; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #ddd; text-align: left; }
  th { text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #5c6b62; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals td { border-bottom: none; padding: 4px 6px; }
  .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #182420; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${esc(hotelName)}</h1>
  <h2 style="margin-top: 28px;">Invoice ${esc(invoice.invoiceNumber)}</h2>
  <p class="muted">Billed to ${esc(invoice.billingName)} &middot; Issued
    ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
  <table>
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit</th>
      <th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="num">${money(invoice.subtotalAmount, invoice.currencyCode)}</td></tr>
    ${invoice.discountAmount > 0
      ? `<tr><td>Discount</td><td class="num">-${money(invoice.discountAmount, invoice.currencyCode)}</td></tr>`
      : ''}
    <tr><td>Tax</td><td class="num">${money(invoice.taxAmount, invoice.currencyCode)}</td></tr>
    <tr><td>Fees</td><td class="num">${money(invoice.feeAmount, invoice.currencyCode)}</td></tr>
    <tr class="grand"><td>Total</td><td class="num">${money(invoice.totalAmount, invoice.currencyCode)}</td></tr>
  </table>
</body>
</html>`;
}

export interface CreditNoteDocData {
  creditNoteNumber: string;
  billingName: string;
  currencyCode: string;
  originalAmount: number;
  penaltyAmount: number;
  creditedAmount: number;
  issuedAt: string;
}

/** Summary of original charge -> penalty retained -> credited back, not a
    re-listing of the original invoice's line items. */
export function buildCreditNoteHtml(
  note: CreditNoteDocData,
  hotelName: string = 'Executive Hotel'
): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Credit note ${esc(note.creditNoteNumber)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #182420; max-width: 640px;
         margin: 40px auto; padding: 0 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #5c6b62; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  td { padding: 6px; text-align: left; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .grand { font-weight: bold; font-size: 15px; border-top: 2px solid #182420; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <h1>${esc(hotelName)}</h1>
  <h2 style="margin-top: 28px;">Credit note ${esc(note.creditNoteNumber)}</h2>
  <p class="muted">Issued to ${esc(note.billingName)} &middot; Issued
    ${new Date(note.issuedAt).toLocaleDateString()} &middot; following a cancellation</p>
  <table>
    <tr><td>Original invoice amount</td><td class="num">${money(note.originalAmount, note.currencyCode)}</td></tr>
    <tr><td>Cancellation fee retained</td>
      <td class="num">-${money(note.penaltyAmount, note.currencyCode)}</td></tr>
    <tr class="grand"><td>Credited back</td>
      <td class="num">${money(note.creditedAmount, note.currencyCode)}</td></tr>
  </table>
</body>
</html>`;
}

export function downloadInvoiceHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
