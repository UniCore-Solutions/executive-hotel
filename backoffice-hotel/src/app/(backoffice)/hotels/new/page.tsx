'use client';

import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { createHotel } from '@/api/rest/endpoints';
import {
  HotelStatus,
  type AdminHotelInput,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/admin/page';
import { Form, FormError, MutationError } from '@/components/admin/forms';

const CURRENCIES = ['MAD', 'USD', 'EUR', 'GBP', 'AED', 'SAR'];
const COUNTRIES = [
  { code: 'MA', name: 'Morocco' },
  { code: 'US', name: 'United States' },
  { code: 'FR', name: 'France' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'ES', name: 'Spain' },
];

export default function NewHotelPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminHotelInput>({
    name: '',
    brand: '',
    city: '',
    countryCode: 'MA',
    defaultCurrency: 'MAD',
    starRating: 4,
    checkInTime: '15:00',
    checkOutTime: '12:00',
    status: HotelStatus.Draft,
  });

  const mutation = useMutation({
    mutationFn: (input: AdminHotelInput) => createHotel(input),
    onSuccess: (data) => {
      router.push(`/hotels/${data.id}`);
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create the hotel.'),
  });

  function set<K extends keyof AdminHotelInput>(key: K, value: AdminHotelInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New hotel" description="Create a hotel on the platform" />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            onSubmit={async () => {
              if (!form.name?.trim()) {
                setError('Name is required.');
                return;
              }
              setError(null);
              await mutation.mutateAsync({ ...form, name: form.name.trim() });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name ?? ''}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Atlas Palace Marrakech"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" value={form.brand ?? ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={form.countryCode ?? 'MA'}
                  onValueChange={(v) => set('countryCode', v)}
                >
                  <SelectTrigger id="country" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Default currency</Label>
                <Select
                  value={form.defaultCurrency ?? 'MAD'}
                  onValueChange={(v) => set('defaultCurrency', v)}
                >
                  <SelectTrigger id="currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="starRating">Star rating</Label>
                <Input
                  id="starRating"
                  type="number"
                  min={1}
                  max={5}
                  value={form.starRating ?? 4}
                  onChange={(e) => set('starRating', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.addressLine1 ?? ''}
                  onChange={(e) => set('addressLine1', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hotelType">Hotel type</Label>
                <Input
                  id="hotelType"
                  value={form.hotelType ?? ''}
                  onChange={(e) => set('hotelType', e.target.value)}
                  placeholder="city / resort / boutique"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Short description</Label>
                <Input
                  id="description"
                  value={form.description ?? ''}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status ?? HotelStatus.Draft}
                  onValueChange={(v) => set('status', v as AdminHotelInput['status'])}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <FormError>{error}</FormError>
            <MutationError error={mutation.error} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create hotel'}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}