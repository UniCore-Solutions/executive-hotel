'use client';

import { useQuery } from '@apollo/client/react';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { SelectField } from '@/components/form/fields/SelectField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { assignRole } from '@/api/rest/endpoints/identity';
import { assignRoleSchema, isHotelScopedRole, type AssignRoleFormValues } from '@/schemas/identity';
import { AdminHotelsDocument, type AdminRolesQuery } from '@/graphql/generated/graphql';
import { humanizeEnum } from '@/lib/format';

/**
 * Grants an existing user an additional role. Embedded in `UserRolesSheet`
 * rather than its own drawer — a 1-2 field form doesn't need its own
 * container, and staying inline lets the sheet's role list update in place
 * right above it after a successful assignment.
 */
export function AssignRoleForm({
  userId,
  roles,
  onAssigned,
}: {
  userId: string;
  roles: AdminRolesQuery['adminRoles'];
  onAssigned: () => void;
}) {
  // Same generous single-page fetch as the Hotels list (NEW-3,
  // docs/ADMIN_REBUILD_PROGRESS.md) — `adminHotels` has no search args, and
  // this is a handful of hotels at most, so a plain client-side <Select> is
  // honest at this scale.
  const { data: hotelsData } = useQuery(AdminHotelsDocument, { variables: { page: { page: 0, size: 100 } } });
  const hotelOptions = [...(hotelsData?.adminHotels.items ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((h) => ({ value: h.id, label: h.city ? `${h.name} — ${h.city}` : h.name }));

  const { form, submit, isSubmitting } = useAdminForm({
    schema: assignRoleSchema,
    defaultValues: { roleName: '', hotelId: undefined },
    mutationFn: (values) =>
      assignRole(userId, {
        roleName: values.roleName,
        hotelId: isHotelScopedRole(values.roleName) ? values.hotelId : undefined,
      }),
    invalidates: 'users.assignRole',
    successMessage: 'Role assigned',
    onSuccess: () => {
      form.reset({ roleName: '', hotelId: undefined });
      onAssigned();
    },
  });

  const roleName = form.watch('roleName');
  const scoped = roleName ? isHotelScopedRole(roleName) : false;

  return (
    <Form form={form} onSubmit={submit} className="space-y-3">
      <FormRow>
        <SelectField<AssignRoleFormValues>
          name="roleName"
          label="Role"
          required
          placeholder="Select a role"
          options={roles.map((r) => ({ value: r.name, label: humanizeEnum(r.name) }))}
        />
        {scoped ? (
          <SelectField<AssignRoleFormValues>
            name="hotelId"
            label="Hotel"
            required
            placeholder="Select a hotel"
            options={hotelOptions}
          />
        ) : null}
      </FormRow>
      <FormActions>
        <Button type="submit" size="sm" loading={isSubmitting} disabled={!roleName}>
          Assign role
        </Button>
      </FormActions>
    </Form>
  );
}
