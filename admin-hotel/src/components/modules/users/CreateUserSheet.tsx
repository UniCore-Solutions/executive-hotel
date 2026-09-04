'use client';

import { useQuery } from '@apollo/client/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody } from '@/components/ui/sheet';
import { Form, FormRow, FormActions } from '@/components/form/Form';
import { TextField } from '@/components/form/fields/TextField';
import { SelectField } from '@/components/form/fields/SelectField';
import { Button } from '@/components/ui/button';
import { useAdminForm } from '@/hooks/useAdminForm';
import { createUser } from '@/api/rest/endpoints/identity';
import { createUserSchema, isHotelScopedRole, type CreateUserFormValues } from '@/schemas/identity';
import { AdminHotelsDocument, type AdminRolesQuery } from '@/graphql/generated/graphql';
import { humanizeEnum } from '@/lib/format';

/**
 * New staff user, one full account + first role assignment in a single
 * write (`POST /api/v1/admin/users`, `AdminCreateUserInput`). A staff
 * account always starts with exactly one role — additional roles or a
 * different hotel come later via `UserRolesSheet`'s assign/revoke actions,
 * same "create is minimal, everything else happens after" split as
 * `RoomTypeCreateSheet`/`RatePlanCreateSheet`.
 */
export function CreateUserSheet({
  open,
  onOpenChange,
  roles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: AdminRolesQuery['adminRoles'];
}) {
  const { data: hotelsData } = useQuery(AdminHotelsDocument, { variables: { page: { page: 0, size: 100 } } });
  const hotelOptions = [...(hotelsData?.adminHotels.items ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((h) => ({ value: h.id, label: h.city ? `${h.name} — ${h.city}` : h.name }));

  const { form, submit, isSubmitting } = useAdminForm({
    schema: createUserSchema,
    defaultValues: { firstName: '', lastName: '', email: '', password: '', roleName: '', hotelId: undefined },
    mutationFn: (values) =>
      createUser({
        firstName: values.firstName || undefined,
        lastName: values.lastName || undefined,
        email: values.email,
        password: values.password,
        roleName: values.roleName,
        hotelId: isHotelScopedRole(values.roleName) ? values.hotelId : undefined,
      }),
    invalidates: 'users.create',
    successMessage: 'User created',
    onSuccess: () => {
      form.reset({ firstName: '', lastName: '', email: '', password: '', roleName: '', hotelId: undefined });
      onOpenChange(false);
    },
  });

  const roleName = form.watch('roleName');
  const scoped = roleName ? isHotelScopedRole(roleName) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>New user</SheetTitle>
          <SheetDescription>
            Creates the account and grants its first role in one step. More roles can be added afterward.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form form={form} onSubmit={submit} className="space-y-4">
            <FormRow>
              <TextField<CreateUserFormValues> name="firstName" label="First name" placeholder="Yasmine" />
              <TextField<CreateUserFormValues> name="lastName" label="Last name" placeholder="El Amrani" />
            </FormRow>
            <TextField<CreateUserFormValues> name="email" label="Email" type="email" required placeholder="staff@hotel.test" />
            <TextField<CreateUserFormValues> name="password" label="Temporary password" type="text" required placeholder="At least 6 characters" />
            <FormRow>
              <SelectField<CreateUserFormValues>
                name="roleName"
                label="Role"
                required
                placeholder="Select a role"
                options={roles.map((r) => ({ value: r.name, label: humanizeEnum(r.name) }))}
              />
              {scoped ? (
                <SelectField<CreateUserFormValues>
                  name="hotelId"
                  label="Hotel"
                  required
                  placeholder="Select a hotel"
                  options={hotelOptions}
                />
              ) : null}
            </FormRow>
            <FormActions>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Create user
              </Button>
            </FormActions>
          </Form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
