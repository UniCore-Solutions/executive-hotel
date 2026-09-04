'use client';

import { useQuery } from '@apollo/client/react';
import { Form, FormRow, FormSection, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { NumberField } from '@/components/form/fields/NumberField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { SelectField } from '@/components/form/fields/SelectField';
import { MultiSelectField } from '@/components/form/fields/MultiSelectField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createHotel, updateHotel } from '@/api/rest/endpoints/catalog';
import { CountriesDocument } from '@/graphql/generated/graphql';
import {
  hotelProfileSchema,
  HOTEL_CURRENCIES,
  HOTEL_LANGUAGES,
  type HotelProfileFormValues,
} from '@/schemas/settings';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
];

const CURRENCY_OPTIONS = HOTEL_CURRENCIES.map((c) => ({ value: c.value, label: c.label }));

// A handful of common IANA zones as a starting point in the datalist — the
// full ~400-zone IANA database is offered too via `Intl.supportedValuesOf`
// (universally supported in the browsers this console targets), so this
// isn't the ceiling, just what shows before the admin starts typing.
const COMMON_TIMEZONES = [
  'Africa/Casablanca',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Tokyo',
];

function allTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return COMMON_TIMEZONES;
  }
}

export interface HotelProfile {
  id: string;
  name: string;
  brand?: string | null;
  description?: string | null;
  hotelType?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  timezone?: string | null;
  languages?: string[] | null;
  starRating?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  defaultCurrency: string;
  status: string;
}

export function HotelProfileForm({
  hotel,
  onSaved,
  onCreated,
  onCancel,
}: {
  /** Omitted for creation (E-NAV-2's "New hotel" drawer) — every field then
      starts blank/default and submit calls `createHotel` instead of
      `updateHotel(hotel.id, …)`. */
  hotel?: HotelProfile;
  /** Called after a successful edit-mode save. */
  onSaved?: () => void;
  /** Called instead of navigating on a successful create — used when this
      form is embedded in a drawer, mirroring RoomTypeDetailsForm's
      onCreated so the caller can close the drawer before navigating. */
  onCreated?: (id: string) => void;
  /** Called instead of nothing on Cancel in create mode (the edit-mode
      Settings page has no Cancel button — the form autosaves per field
      group — so this is create-only). */
  onCancel?: () => void;
}) {
  const isEdit = Boolean(hotel);
  const { form, submit, isSubmitting } = useAdminForm({
    schema: hotelProfileSchema,
    defaultValues: {
      name: hotel?.name ?? '',
      brand: hotel?.brand ?? '',
      description: hotel?.description ?? '',
      hotelType: hotel?.hotelType ?? '',
      addressLine1: hotel?.addressLine1 ?? '',
      addressLine2: hotel?.addressLine2 ?? '',
      city: hotel?.city ?? '',
      countryCode: hotel?.countryCode ?? '',
      latitude: hotel?.latitude ?? undefined,
      longitude: hotel?.longitude ?? undefined,
      phone: hotel?.phone ?? '',
      email: hotel?.email ?? '',
      website: hotel?.website ?? '',
      timezone: hotel?.timezone ?? '',
      languages: hotel?.languages ?? [],
      starRating: hotel?.starRating ?? undefined,
      checkInTime: hotel?.checkInTime ?? '',
      checkOutTime: hotel?.checkOutTime ?? '',
      defaultCurrency: (hotel?.defaultCurrency as HotelProfileFormValues['defaultCurrency']) ?? 'MAD',
      status: (hotel?.status as HotelProfileFormValues['status']) ?? 'active',
    },
    mutationFn: (values) => (isEdit ? updateHotel(hotel!.id, values) : createHotel(values)),
    invalidates: isEdit ? 'hotels.update' : 'hotels.create',
    successMessage: isEdit ? 'Profile updated' : 'Hotel created',
    onSuccess: (result) => {
      if (isEdit) {
        onSaved?.();
      } else {
        onCreated?.((result as { id: string }).id);
      }
    },
  });

  // Reference data for the two datalist-backed fields below — native
  // `<datalist>` autocomplete, not a new combobox component (see
  // `TextField`'s `list` prop doc): a searchable-dropdown UI primitive
  // doesn't exist in this app yet, and building one for two fields in an
  // already-large redesign isn't worth it. `countries` is real backend
  // reference data (the same query `frontend-hotel`'s guest-site
  // `CountryCombobox` uses); timezones come from the browser's own IANA
  // database (`Intl.supportedValuesOf`) — no backend query needed for that.
  const { data: countriesData } = useQuery(CountriesDocument);
  const countries = countriesData?.countries ?? [];

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <datalist id="hotel-profile-countries">
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name}
          </option>
        ))}
      </datalist>
      <datalist id="hotel-profile-timezones">
        {allTimezones().map((tz) => (
          <option key={tz} value={tz} />
        ))}
      </datalist>

      <FormSection title="General information">
        <FormRow>
          <TextField<HotelProfileFormValues> name="name" label="Name" required placeholder="Executive Hotel" />
          <TextField<HotelProfileFormValues> name="brand" label="Brand" placeholder="Executive Hotel" />
        </FormRow>
        <TextareaField<HotelProfileFormValues>
          name="description"
          label="Description"
          rows={4}
          placeholder="A short, guest-facing description of this hotel."
        />
        <FormRow>
          <TextField<HotelProfileFormValues> name="hotelType" label="Hotel type" placeholder="resort, boutique…" />
          <NumberField<HotelProfileFormValues> name="starRating" label="Star rating" min={1} max={5} />
        </FormRow>
        <SelectField<HotelProfileFormValues> name="status" label="Status" required options={STATUS_OPTIONS} />
      </FormSection>

      <FormSection title="Contact" description="How guests and staff reach this hotel directly.">
        <FormRow>
          <TextField<HotelProfileFormValues> name="phone" label="Phone" type="tel" />
          <TextField<HotelProfileFormValues> name="email" label="Email" type="email" />
        </FormRow>
        <TextField<HotelProfileFormValues>
          name="website"
          label="Website"
          type="url"
          placeholder="https://example.com"
        />
      </FormSection>

      <FormSection title="Location">
        <FormRow>
          <TextField<HotelProfileFormValues> name="addressLine1" label="Address line 1" />
          <TextField<HotelProfileFormValues> name="addressLine2" label="Address line 2" />
        </FormRow>
        <FormRow>
          <TextField<HotelProfileFormValues> name="city" label="City" />
          <TextField<HotelProfileFormValues>
            name="countryCode"
            label="Country"
            placeholder="Start typing a country…"
            list="hotel-profile-countries"
          />
        </FormRow>
        <FormRow>
          <NumberField<HotelProfileFormValues> name="latitude" label="Latitude" step={0.0001} />
          <NumberField<HotelProfileFormValues> name="longitude" label="Longitude" step={0.0001} />
        </FormRow>
      </FormSection>

      <FormSection title="Localization" description="Currency, timezone, and languages spoken at this hotel.">
        <FormRow>
          <SelectField<HotelProfileFormValues>
            name="defaultCurrency"
            label="Default currency"
            required
            options={CURRENCY_OPTIONS}
          />
          <TextField<HotelProfileFormValues>
            name="timezone"
            label="Timezone"
            placeholder="Start typing a timezone…"
            list="hotel-profile-timezones"
          />
        </FormRow>
        <MultiSelectField<HotelProfileFormValues>
          name="languages"
          label="Languages spoken"
          options={HOTEL_LANGUAGES.map((l) => ({ value: l.value, label: l.label }))}
        />
      </FormSection>

      <FormSection title="Operational settings" description="Standard check-in and check-out times.">
        <FormRow>
          <TextField<HotelProfileFormValues> name="checkInTime" label="Check-in time" placeholder="15:00" />
          <TextField<HotelProfileFormValues> name="checkOutTime" label="Check-out time" placeholder="12:00" />
        </FormRow>
      </FormSection>

      <FormActions>
        {!isEdit ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save changes' : 'Create hotel'}
        </Button>
      </FormActions>
    </Form>
  );
}
