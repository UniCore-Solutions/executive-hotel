import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTablePagination } from './DataTablePagination';

describe('DataTablePagination', () => {
  it('shows "No results" and disables both buttons when the table is empty', () => {
    render(<DataTablePagination page={0} pageSize={20} total={0} onPageChange={vi.fn()} />);
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('computes the visible range for a full middle page', () => {
    render(<DataTablePagination page={1} pageSize={20} total={45} onPageChange={vi.fn()} />);
    // page 1 (0-indexed) of size 20 covers items 21-40 of 45.
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('clamps the "to" bound on a partial last page', () => {
    render(<DataTablePagination page={2} pageSize={20} total={45} onPageChange={vi.fn()} />);
    // page 2 covers items 41-45, not 41-60. "45" appears twice (the "to"
    // bound and the total), which is itself part of what's being asserted.
    expect(screen.getByText('41')).toBeInTheDocument();
    expect(screen.getAllByText('45')).toHaveLength(2);
    expect(screen.queryByText('60')).not.toBeInTheDocument();
  });

  it('treats a total smaller than one page as exactly one page (never zero pages)', () => {
    render(<DataTablePagination page={0} pageSize={20} total={3} onPageChange={vi.fn()} />);
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('disables Previous on the first page but not Next', () => {
    render(<DataTablePagination page={0} pageSize={20} total={45} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();
  });

  it('disables Next on the last page but not Previous', () => {
    render(<DataTablePagination page={2} pageSize={20} total={45} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled();
  });

  it('disables both buttons while loading, even mid-page', () => {
    render(<DataTablePagination page={1} pageSize={20} total={45} onPageChange={vi.fn()} loading />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('calls onPageChange with page - 1 / page + 1', async () => {
    const onPageChange = vi.fn();
    render(<DataTablePagination page={1} pageSize={20} total={45} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 0);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 2);
  });
});
