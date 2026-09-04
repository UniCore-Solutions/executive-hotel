import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { invoiceColumns, type InvoiceRow } from './columns';
import { ToastProvider } from '@/context/ToastContext';
import { ApiError } from '@/lib/api';

const downloadInvoiceMock = vi.fn();
const downloadCreditNoteMock = vi.fn();
const downloadBytesMock = vi.fn();

vi.mock('@/api/rest/endpoints/reservations', () => ({
  adminDownloadInvoicePdf: (...args: unknown[]) => downloadInvoiceMock(...args),
  adminDownloadCreditNotePdf: (...args: unknown[]) => downloadCreditNoteMock(...args),
}));

vi.mock('@/lib/download', () => ({
  downloadBytes: (...args: unknown[]) => downloadBytesMock(...args),
}));

function cellFor(id: string, original: InvoiceRow) {
  const col = invoiceColumns.find((c) => c.id === id)!;
  const render_ = col.cell as (ctx: { row: { original: InvoiceRow } }) => React.ReactNode;
  return render_({ row: { original } });
}

function invoice(overrides: Partial<InvoiceRow>): InvoiceRow {
  return {
    id: 'inv1',
    invoiceNumber: 'INV-RC-ABC123',
    reservationId: '11111111-2222-3333-4444-555555555555',
    billingName: 'Jane Doe',
    currencyCode: 'MAD',
    totalAmount: 4200,
    status: 'issued',
    issuedAt: '2026-06-01T10:00:00Z',
    ...overrides,
  } as InvoiceRow;
}

function renderWithToast(node: React.ReactNode) {
  return render(<ToastProvider>{node}</ToastProvider>);
}

beforeEach(() => {
  downloadInvoiceMock.mockReset();
  downloadCreditNoteMock.mockReset();
  downloadBytesMock.mockReset();
});

describe('invoiceColumns — static fields', () => {
  it('renders the invoice number', () => {
    render(<>{cellFor('invoiceNumber', invoice({}))}</>);
    expect(screen.getByText('INV-RC-ABC123')).toBeInTheDocument();
  });

  it('truncates the raw reservation id, keeping the full id in the title', () => {
    render(<>{cellFor('reservationId', invoice({}))}</>);
    expect(screen.getByText('11111111…')).toHaveAttribute('title', '11111111-2222-3333-4444-555555555555');
  });

  it('renders the billing name as the guest', () => {
    render(<>{cellFor('billingName', invoice({ billingName: 'Omar Azhari' }))}</>);
    expect(screen.getByText('Omar Azhari')).toBeInTheDocument();
  });
});

describe('invoiceColumns — actions', () => {
  it('downloads the invoice PDF and shows a success toast', async () => {
    downloadInvoiceMock.mockResolvedValue({ content: new ArrayBuffer(4), filename: 'INV-RC-ABC123.pdf' });
    renderWithToast(<>{cellFor('actions', invoice({}))}</>);

    fireEvent.click(screen.getByLabelText('Download invoice PDF'));

    await waitFor(() => expect(downloadBytesMock).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'INV-RC-ABC123.pdf', 'application/pdf'));
    expect(downloadInvoiceMock).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555');
    expect(await screen.findByText('Invoice ready')).toBeInTheDocument();
  });

  it('explains a 404 on credit-note download as "never cancelled" rather than a generic error', async () => {
    downloadCreditNoteMock.mockRejectedValue(new ApiError('no credit note exists for this reservation', 'NOT_FOUND'));
    renderWithToast(<>{cellFor('actions', invoice({}))}</>);

    fireEvent.click(screen.getByLabelText('Download credit note PDF'));

    expect(await screen.findByText('Credit note unavailable')).toBeInTheDocument();
    expect(screen.getByText('This reservation was never cancelled, so no credit note was issued.')).toBeInTheDocument();
    expect(downloadBytesMock).not.toHaveBeenCalled();
  });

  it('downloads the credit note PDF and shows a success toast when one exists', async () => {
    downloadCreditNoteMock.mockResolvedValue({ content: new ArrayBuffer(4), filename: 'CN-RC-ABC123.pdf' });
    renderWithToast(<>{cellFor('actions', invoice({}))}</>);

    fireEvent.click(screen.getByLabelText('Download credit note PDF'));

    await waitFor(() => expect(downloadBytesMock).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'CN-RC-ABC123.pdf', 'application/pdf'));
    expect(await screen.findByText('Credit note ready')).toBeInTheDocument();
  });
});
