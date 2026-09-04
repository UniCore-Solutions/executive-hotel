import type { ColumnDef } from '@tanstack/react-table';
import { Check, Star, X } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import type { AdminReviewsQuery } from '@/graphql/generated/graphql';

export type ReviewRow = AdminReviewsQuery['adminReviews']['items'][number];

const EXCERPT_LENGTH = 140;

function excerpt(comment: string | null | undefined): string {
  if (!comment) return '—';
  return comment.length > EXCERPT_LENGTH ? `${comment.slice(0, EXCERPT_LENGTH)}…` : comment;
}

export function buildReviewColumns(
  onApprove: (row: ReviewRow) => void,
  onReject: (row: ReviewRow) => void,
): ColumnDef<ReviewRow, unknown>[] {
  return [
    {
      id: 'author',
      header: 'Guest',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-ink">{row.original.authorName ?? 'Anonymous guest'}</p>
          {row.original.title ? <p className="text-xs text-muted-foreground">{row.original.title}</p> : null}
        </div>
      ),
    },
    {
      id: 'rating',
      header: 'Rating',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
          <Star className="size-3.5 fill-gold text-gold" />
          {row.original.rating}
        </span>
      ),
    },
    {
      id: 'comment',
      header: 'Comment',
      cell: ({ row }) => (
        <p className="max-w-xl text-xs text-muted-foreground">{excerpt(row.original.comment)}</p>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge domain="review" value={row.original.moderationStatus} />,
    },
    {
      id: 'createdAt',
      header: 'Submitted',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatDate(row.original.createdAt)}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const status = row.original.moderationStatus;
        return (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={status === 'approved'}
              onClick={(e) => {
                e.stopPropagation();
                onApprove(row.original);
              }}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-clay-dark hover:bg-clay-light/20"
              disabled={status === 'rejected'}
              onClick={(e) => {
                e.stopPropagation();
                onReject(row.original);
              }}
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];
}
