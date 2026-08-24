'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { proxyRequest } from '@/lib/api';
import {
  AdminAmenitiesDocument,
  AdminHotelWorkspaceDocument,
  SetHotelAmenitiesDocument,
  SetHotelMediaDocument,
  UpdateHotelDocument,
  type AdminHotelInput,
  type AdminHotelWorkspaceQuery,
  type MediaInput,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Form, FormError, MutationError } from '@/components/admin/forms';

function useWorkspace(hotelId: string) {
  return useQuery({
    queryKey: ['adminHotel', hotelId],
    queryFn: () => proxyRequest(AdminHotelWorkspaceDocument, { hotelId }),
  });
}

export function OverviewTab({ hotelId }: { hotelId: string }) {
  const { data } = useWorkspace(hotelId);
  if (!data?.adminHotel) return null;
  return <OverviewContent hotelId={hotelId} workspace={data.adminHotel} />;
}

function OverviewContent({
  hotelId,
  workspace,
}: {
  hotelId: string;
  workspace: NonNullable<AdminHotelWorkspaceQuery['adminHotel']>;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminHotelInput | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const hotel = workspace.hotel;
  const current = form ?? {
    name: hotel.name,
    brand: hotel.brand ?? undefined,
    description: hotel.description ?? undefined,
    hotelType: hotel.hotelType ?? undefined,
    addressLine1: hotel.addressLine1 ?? undefined,
    addressLine2: hotel.addressLine2 ?? undefined,
    city: hotel.city ?? undefined,
    countryCode: hotel.countryCode,
    phone: hotel.phone ?? undefined,
    email: hotel.email ?? undefined,
    starRating: hotel.starRating ?? undefined,
    checkInTime: hotel.checkInTime ?? undefined,
    checkOutTime: hotel.checkOutTime ?? undefined,
    defaultCurrency: hotel.defaultCurrency,
    status: hotel.status,
  };

  const update = useMutation({
    mutationFn: (input: AdminHotelInput) =>
      proxyRequest(UpdateHotelDocument, { id: hotelId, input }),
    onSuccess: () => {
      setForm(null);
      void queryClient.invalidateQueries({ queryKey: ['adminHotel', hotelId] });
    },
  });

  const amenitiesQuery = useQuery({
    queryKey: ['adminAmenities'],
    queryFn: () => proxyRequest(AdminAmenitiesDocument, {}),
  });
  const selectedAmenities = workspace.amenities.map((a) => a.id);
  const setAmenities = useMutation({
    mutationFn: (amenityIds: string[]) =>
      proxyRequest(SetHotelAmenitiesDocument, { hotelId, amenityIds }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['adminHotel', hotelId] }),
  });

  const [media, setMedia] = useState<MediaInput[] | null>(null);
  const mediaDraft = media ?? workspace.media.map((m) => ({
    url: m.url,
    altText: m.altText ?? undefined,
    category: m.category ?? undefined,
    isPrimary: m.isPrimary,
    sortOrder: m.sortOrder,
  }));
  const setMediaMutation = useMutation({
    mutationFn: (rows: MediaInput[]) => proxyRequest(SetHotelMediaDocument, { hotelId, media: rows }),
    onSuccess: () => {
      setMedia(null);
      void queryClient.invalidateQueries({ queryKey: ['adminHotel', hotelId] });
    },
    onError: (err) => setMediaError(err instanceof Error ? err.message : 'Could not save media.'),
  });

  function set<K extends keyof AdminHotelInput>(key: K, value: AdminHotelInput[K]) {
    setForm((f) => (f ?? current) && { ...(f ?? current), [key]: value });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Hotel details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            onSubmit={async () => {
              await update.mutateAsync(current);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ov-name">Name</Label>
                <Input id="ov-name" value={current.name ?? ''} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-brand">Brand</Label>
                <Input id="ov-brand" value={current.brand ?? ''} onChange={(e) => set('brand', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-city">City</Label>
                <Input id="ov-city" value={current.city ?? ''} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-country">Country code</Label>
                <Input id="ov-country" value={current.countryCode ?? ''} onChange={(e) => set('countryCode', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-phone">Phone</Label>
                <Input id="ov-phone" value={current.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-email">Email</Label>
                <Input id="ov-email" value={current.email ?? ''} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-star">Star rating</Label>
                <Input
                  id="ov-star"
                  type="number"
                  min={1}
                  max={5}
                  value={current.starRating ?? ''}
                  onChange={(e) => set('starRating', e.target.value === '' ? undefined : Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-checkin">Check-in time</Label>
                <Input id="ov-checkin" value={current.checkInTime ?? ''} onChange={(e) => set('checkInTime', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-checkout">Check-out time</Label>
                <Input id="ov-checkout" value={current.checkOutTime ?? ''} onChange={(e) => set('checkOutTime', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-type">Hotel type</Label>
                <Input id="ov-type" value={current.hotelType ?? ''} onChange={(e) => set('hotelType', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ov-status">Status</Label>
                <Input id="ov-status" value={current.status ?? ''} onChange={(e) => set('status', e.target.value as AdminHotelInput['status'])} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ov-address">Address</Label>
                <Input id="ov-address" value={current.addressLine1 ?? ''} onChange={(e) => set('addressLine1', e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ov-description">Description</Label>
                <Input id="ov-description" value={current.description ?? ''} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>
            <MutationError error={update.error} />
            <div className="flex justify-end">
              <Button type="submit" disabled={update.isPending} variant="gold">
                {update.isPending ? 'Saving…' : 'Save details'}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Amenities</CardTitle>
          </CardHeader>
          <CardContent>
            {amenitiesQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading catalog…</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(amenitiesQuery.data?.adminAmenities ?? []).map((amenity) => {
                  const active = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => {
                        const next = active
                          ? selectedAmenities.filter((id) => id !== amenity.id)
                          : [...selectedAmenities, amenity.id];
                        setAmenities.mutate(next);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-gold bg-gold/10 text-gold-dark'
                          : 'border-border bg-white text-muted-foreground hover:border-gold/40',
                      )}
                    >
                      {active ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                      {amenity.name}
                    </button>
                  );
                })}
              </div>
            )}
            <MutationError error={setAmenities.error} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mediaDraft.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    aria-label={`Media URL ${index + 1}`}
                    placeholder="https://…/image.jpg"
                    value={row.url ?? ''}
                    onChange={(e) => {
                      const next = [...mediaDraft];
                      next[index] = { ...row, url: e.target.value };
                      setMedia(next);
                    }}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.isPrimary ?? false}
                      onChange={(e) => {
                        const next = mediaDraft.map((m, i) =>
                          i === index ? { ...m, isPrimary: e.target.checked } : m,
                        );
                        setMedia(next);
                      }}
                    />
                    Primary
                  </label>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMedia([...mediaDraft, { url: '', isPrimary: false, sortOrder: mediaDraft.length + 1 }])}
              >
                Add image
              </Button>
            </div>
            {mediaError ? <FormError>{mediaError}</FormError> : null}
            <MutationError error={setMediaMutation.error} />
            <div className="mt-4 flex justify-end">
              <Button
                variant="gold"
                disabled={setMediaMutation.isPending}
                onClick={() => setMediaMutation.mutate(mediaDraft)}
              >
                {setMediaMutation.isPending ? 'Saving…' : 'Save media'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}