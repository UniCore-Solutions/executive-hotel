import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTableToolbar } from './DataTableToolbar';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DataTableToolbar', () => {
  it('renders the current search value and a placeholder', () => {
    render(<DataTableToolbar searchValue="ines" onSearchChange={vi.fn()} searchPlaceholder="Find a guest…" />);
    expect(screen.getByPlaceholderText('Find a guest…')).toHaveValue('ines');
  });

  it('does not push a change immediately on keystroke — only after the debounce settles', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DataTableToolbar searchValue="" onSearchChange={onSearchChange} />);
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'ines');
    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('pushes the debounced value once typing settles', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DataTableToolbar searchValue="" onSearchChange={onSearchChange} />);
    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'ines');
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(onSearchChange).toHaveBeenLastCalledWith('ines');
  });

  it('shows a clear button only when there is text, and clearing empties the field', async () => {
    const onSearchChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DataTableToolbar searchValue="" onSearchChange={onSearchChange} />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Search' }), 'ines');
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
  });

  it('adopts an external searchValue reset (e.g. a filter cleared elsewhere) without re-triggering onSearchChange', () => {
    const onSearchChange = vi.fn();
    const { rerender } = render(<DataTableToolbar searchValue="ines" onSearchChange={onSearchChange} />);
    rerender(<DataTableToolbar searchValue="" onSearchChange={onSearchChange} />);
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveValue('');
    act(() => {
      vi.advanceTimersByTime(350);
    });
    // The debounced value now matches the external prop, so the effect's
    // `debounced !== searchValue` guard must not fire a redundant change.
    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('renders optional filters and actions content', () => {
    render(
      <DataTableToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        filters={<span>Status: Confirmed</span>}
        actions={<button type="button">Export</button>}
      />
    );
    expect(screen.getByText('Status: Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });
});
