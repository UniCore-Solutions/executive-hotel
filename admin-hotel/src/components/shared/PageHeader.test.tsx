import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Reservations" />);
    expect(screen.getByRole('heading', { name: 'Reservations' })).toBeInTheDocument();
  });

  it('renders an optional description', () => {
    render(<PageHeader title="Reservations" description="Every booking for this hotel." />);
    expect(screen.getByText('Every booking for this hotel.')).toBeInTheDocument();
  });

  it('renders optional actions and breadcrumb content', () => {
    render(
      <PageHeader
        title="Room types"
        breadcrumb={<span>Hotels / Executive Hotel</span>}
        actions={<button type="button">New room type</button>}
      />
    );
    expect(screen.getByText('Hotels / Executive Hotel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New room type' })).toBeInTheDocument();
  });

  it('omits description, breadcrumb and actions entirely when not given', () => {
    const { container } = render(<PageHeader title="Guests" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
