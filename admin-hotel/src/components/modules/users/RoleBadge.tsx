import { Badge } from '@/components/ui/badge';
import { humanizeEnum } from '@/lib/format';

/**
 * One role assignment, rendered consistently wherever a role appears (the
 * list's Roles column, the per-user management sheet). `super_admin` gets
 * its own tone since it is the one role that bypasses `requireHotelAccess`
 * entirely (`CurrentUserAccessor`) — worth visually standing out from an
 * ordinary hotel-scoped assignment.
 */
export function RoleBadge({ roleName, hotelName }: { roleName: string; hotelName?: string | null }) {
  const variant = roleName === 'super_admin' ? 'gold' : roleName === 'guest' ? 'neutral' : 'navy';
  return (
    <Badge variant={variant}>
      {humanizeEnum(roleName)}
      {hotelName ? <span className="font-normal opacity-75"> · {hotelName}</span> : null}
    </Badge>
  );
}
