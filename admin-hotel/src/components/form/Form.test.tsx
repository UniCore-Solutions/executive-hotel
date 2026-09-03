import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormActions, FormField } from './Form';

const schema = z.object({ name: z.string().min(2, 'Name is required') });

function TestForm({ onSubmit, defaultValues = { name: '' } }: { onSubmit: (v: { name: string }) => void; defaultValues?: { name: string } }) {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues });
  return (
    <Form form={form} onSubmit={form.handleSubmit(onSubmit)}>
      <FormField name="name" label="Name" required>
        {(field) => <input aria-label="Name" value={field.value as string} onChange={(e) => field.onChange(e.target.value)} />}
      </FormField>
      <FormActions>
        <button type="submit">Save</button>
      </FormActions>
    </Form>
  );
}

describe('Form + FormField', () => {
  it('renders the label with a required marker', () => {
    render(<TestForm onSubmit={vi.fn()} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onSubmit with the validated values when the form is valid', async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} defaultValues={{ name: 'Executive Hotel' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Executive Hotel' }, expect.anything());
  });

  it('blocks submission and shows the field error when validation fails', async () => {
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} defaultValues={{ name: '' }} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required');
  });

  it('renders no native browser validation UI (noValidate)', () => {
    const { container } = render(<TestForm onSubmit={vi.fn()} />);
    expect(container.getElementsByTagName('form')[0]).toHaveAttribute('novalidate');
  });
});
