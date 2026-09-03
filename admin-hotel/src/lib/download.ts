/** Triggers a browser download of raw bytes returned from a backend endpoint
    (e.g. a generated invoice/credit-note PDF) — just saving what the server
    already produced, no client-side document construction. */
export function downloadBytes(data: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
