import { describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog, useConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} onOpenChange={vi.fn()} title="Cancel reservation" onConfirm={vi.fn()} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the title, description and both buttons when open', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Cancel reservation"
        description="This cannot be undone."
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Cancel reservation')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('honors custom confirm/cancel labels', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Assign room"
        confirmLabel="Assign"
        cancelLabel="Not now"
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Assign' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Not now' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="Cancel reservation" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when the cancel button is clicked, without confirming', async () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Cancel reservation" onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables both buttons while loading, so a slow confirm cannot be double-fired', () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="Cancel reservation" onConfirm={vi.fn()} loading />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('renders extra context passed as children so the consequence is stated, not implied', () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Cancel reservation" onConfirm={vi.fn()}>
        <p>Penalty: 500 MAD (non-refundable rate)</p>
      </ConfirmDialog>
    );
    expect(screen.getByText('Penalty: 500 MAD (non-refundable rate)')).toBeInTheDocument();
  });
});

describe('useConfirmDialog', () => {
  it('starts closed and toggles via show/hide/onOpenChange', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.open).toBe(false);

    act(() => result.current.show());
    expect(result.current.open).toBe(true);

    act(() => result.current.hide());
    expect(result.current.open).toBe(false);

    act(() => result.current.onOpenChange(true));
    expect(result.current.open).toBe(true);
  });
});
