'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useQuery } from '@apollo/client/react';
import { AdminAmenitiesDocument } from '@/graphql/generated/graphql';
import { useApollo } from '@/api/apollo/provider';
import { invalidateGraphql } from '@/api/invalidation';
import { useToast } from '@/context/ToastContext';
import { setHotelAmenities } from '@/api/rest/endpoints/catalog';
import { Form, FormActions } from '@/components/form/Form';
import { MultiSelectField } from '@/components/form/fields/MultiSelectField';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface Values {
  amenityIds: string[];
}

export function HotelAmenitiesForm({
  hotelId,
  currentAmenityIds,
  onSaved,
}: {
  hotelId: string;
  currentAmenityIds: string[];
  onSaved?: () => void;
}) {
  const { data, loading, error, refetch } = useQuery(AdminAmenitiesDocument);
  const apollo = useApollo();
  const { toast } = useToast();
  const form = useForm<Values>({ defaultValues: { amenityIds: currentAmenityIds } });

  const mutation = useMutation({
    mutationFn: (values: Values) => setHotelAmenities(hotelId, values.amenityIds),
    onSuccess: () => {
      invalidateGraphql(apollo, 'hotels.amenities');
      toast({ title: 'Amenities updated', variant: 'success' });
      onSaved?.();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Could not save amenities',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      });
    },
  });

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const options = (data?.adminAmenities ?? []).map((a) => ({
    value: a.id,
    label: a.name,
    hint: a.category ? `· ${a.category}` : undefined,
  }));

  return (
    <Form form={form} onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <MultiSelectField<Values>
        name="amenityIds"
        label="Amenities"
        description="Shown on the hotel's guest-facing page."
        options={options}
      />
      <FormActions>
        <Button type="submit" loading={mutation.isPending}>
          Save amenities
        </Button>
      </FormActions>
    </Form>
  );
}
