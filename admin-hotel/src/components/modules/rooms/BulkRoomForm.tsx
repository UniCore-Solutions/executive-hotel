'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { NumberField } from '@/components/form/fields/NumberField';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { bulkCreateRooms } from '@/api/rest/endpoints/catalog';
import {
  bulkRoomsPatternSchema,
  bulkRoomsManualSchema,
  parseRoomNumbersText,
  previewPatternRoomNumbers,
  type BulkRoomsPatternFormValues,
  type BulkRoomsManualFormValues,
} from '@/schemas/rooms';

/**
 * Add several physical rooms to a room type at once — a pattern generator
 * (prefix/start/count -> a live-previewed number sequence, e.g.
 * "DLX-101 … DLX-110") or a manual pasted list, matching how an admin would
 * actually receive a numbering scheme (a spreadsheet, a verbal range, or
 * neither). Server-side (`CatalogAdminServiceImpl.bulkCreateRooms`) is the
 * source of truth for the final numbers and collision checking — the
 * preview here is cosmetic, never sent as-is.
 *
 * No `<Sheet>` wrapper of its own — reused both standalone (`BulkRoomSheet`,
 * from the Room Type edit page's Rooms tab) and inline as the optional
 * second step of `RoomTypeCreateSheet`, which is already its own Sheet.
 */
export function BulkRoomForm({
  hotelId,
  roomTypeId,
  onCancel,
  onSaved,
}: {
  hotelId: string;
  roomTypeId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const patternForm = useAdminForm({
    schema: bulkRoomsPatternSchema,
    defaultValues: { prefix: '', startNumber: 101, count: 10, floor: '' },
    mutationFn: (values) =>
      bulkCreateRooms(hotelId, roomTypeId, {
        prefix: values.prefix || undefined,
        startNumber: values.startNumber,
        count: values.count,
        floor: values.floor || undefined,
      }),
    invalidates: 'rooms.bulkCreate',
    successMessage: 'Rooms created',
    onSuccess: onSaved,
  });

  const manualForm = useAdminForm({
    schema: bulkRoomsManualSchema,
    defaultValues: { roomNumbersText: '', floor: '' },
    mutationFn: (values) =>
      bulkCreateRooms(hotelId, roomTypeId, {
        roomNumbers: parseRoomNumbersText(values.roomNumbersText),
        floor: values.floor || undefined,
      }),
    invalidates: 'rooms.bulkCreate',
    successMessage: 'Rooms created',
    onSuccess: onSaved,
  });

  const prefix = patternForm.form.watch('prefix');
  const startNumber = patternForm.form.watch('startNumber');
  const count = patternForm.form.watch('count');
  const preview = useMemo(
    () => (startNumber != null && count ? previewPatternRoomNumbers(prefix, startNumber, count) : []),
    [prefix, startNumber, count],
  );

  const manualText = manualForm.form.watch('roomNumbersText');
  const manualPreview = useMemo(() => parseRoomNumbersText(manualText ?? ''), [manualText]);

  return (
    <Tabs defaultValue="pattern">
      <TabsList>
        <TabsTrigger value="pattern">Pattern</TabsTrigger>
        <TabsTrigger value="manual">Manual</TabsTrigger>
      </TabsList>

      <TabsContent value="pattern" className="space-y-4">
        <Form form={patternForm.form} onSubmit={patternForm.submit} className="space-y-4">
          <FormRow>
            <TextField<BulkRoomsPatternFormValues> name="prefix" label="Prefix" placeholder="DLX (optional)" />
            <TextField<BulkRoomsPatternFormValues> name="floor" label="Floor" placeholder="1 (optional)" />
          </FormRow>
          <FormRow>
            <NumberField<BulkRoomsPatternFormValues> name="startNumber" label="Starting number" required min={0} />
            <NumberField<BulkRoomsPatternFormValues> name="count" label="Number of rooms" required min={1} max={200} />
          </FormRow>
          {preview.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Will create {preview.length} room{preview.length === 1 ? '' : 's'}:
              </p>
              <p className="font-mono text-xs text-ink">
                {preview.length > 8
                  ? `${preview.slice(0, 4).join(', ')} … ${preview.slice(-4).join(', ')}`
                  : preview.join(', ')}
              </p>
            </div>
          ) : null}
          <FormActions>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={patternForm.isSubmitting}>
              Create rooms
            </Button>
          </FormActions>
        </Form>
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <Form form={manualForm.form} onSubmit={manualForm.submit} className="space-y-4">
          <TextareaField<BulkRoomsManualFormValues>
            name="roomNumbersText"
            label="Room numbers"
            description="One per line, or comma-separated."
            rows={6}
            placeholder={'101\n102\n103'}
          />
          <TextField<BulkRoomsManualFormValues> name="floor" label="Floor" placeholder="1 (optional, applies to all)" />
          {manualPreview.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Will create {manualPreview.length} room{manualPreview.length === 1 ? '' : 's'}.
            </p>
          ) : null}
          <FormActions>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={manualForm.isSubmitting}>
              Create rooms
            </Button>
          </FormActions>
        </Form>
      </TabsContent>
    </Tabs>
  );
}
