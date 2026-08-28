'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@apollo/client/react';
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { moderateReview } from '@/api/rest/endpoints';
import { useApollo } from '@/api/apollo/provider';
import { invalidateAfterWrite } from '@/api/invalidation';
import { formatDateTime } from '@/lib/format';
import {
  AdminReviewsDocument,
  ReviewModerationStatus,
  type ReviewModerationStatus as ReviewModerationStatusType,
} from '@/graphql/generated/graphql';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader, StatusBadge } from '@/components/admin/page';
import { MutationError } from '@/components/admin/forms';
import { useHotelScope } from '@/context/HotelScopeContext';

const FILTERS: { value: ReviewModerationStatusType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: ReviewModerationStatus.Pending, label: 'Pending' },
  { value: ReviewModerationStatus.Approved, label: 'Approved' },
  { value: ReviewModerationStatus.Rejected, label: 'Rejected' },
];

export default function ReviewsPage() {
  const { hotels, activeHotelId } = useHotelScope();
  const [filter, setFilter] = useState<ReviewModerationStatusType | 'ALL'>('ALL');
  const [selected, setSelected] = useState<{
    id: string;
    rating: number;
    title: string | null;
    comment: string | null;
    moderationStatus: string;
    responseText: string | null;
  } | null>(null);
  const [responseDraft, setResponseDraft] = useState('');
  const queryClient = useQueryClient();
  const apollo = useApollo();

  const { data, loading } = useQuery(AdminReviewsDocument, {
    variables: {
      hotelId: activeHotelId ?? '',
      status: filter === 'ALL' ? undefined : filter,
      page: { page: 0, size: 50 },
    },
    skip: !activeHotelId,
  });

  const moderate = useMutation({
    mutationFn: (args: { id: string; status: ReviewModerationStatusType; response?: string }) =>
      moderateReview(args.id, { status: args.status, response: args.response }),
    onSuccess: () => {
      setSelected(null);
      invalidateAfterWrite(apollo, queryClient, 'admin.reviews.moderate', [['adminReviews']]);
    },
  });

  if (hotels.length === 0) {
    return (
      <Card className="mx-auto mt-16 max-w-md items-center text-center">
        <CardContent>
          <p className="text-sm text-muted-foreground">You are not a member of any hotel.</p>
        </CardContent>
      </Card>
    );
  }

  const reviews = data?.adminReviews.items ?? [];

  return (
    <div>
      <PageHeader title="Reviews" description="Guest reviews and moderation" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'border-navy bg-navy text-white'
                : 'border-border bg-white text-muted-foreground hover:border-navy/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading ? (
        <Skeleton className="h-72 w-full" />
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="text-sm text-muted-foreground">No reviews.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="cursor-pointer gap-2 py-4" onClick={() => {
              setSelected({ id: r.id, rating: r.rating, title: r.title ?? null, comment: r.comment ?? null, moderationStatus: r.moderationStatus, responseText: r.responseText ?? null });
              setResponseDraft(r.responseText ?? '');
            }}>
              <CardContent className="px-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-navy">
                      {r.title || 'Untitled'} <span className="text-gold-dark">{"★".repeat(r.rating)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.authorName ?? 'Anonymous'} · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.moderationStatus} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.comment}</p>
                {r.responseText ? (
                  <p className="mt-2 rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                    Response: {r.responseText}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.title || 'Review'}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <p className="text-muted-foreground">{selected.comment}</p>
              <label className="block space-y-1">
                <Label htmlFor="review-response">Response to the guest</Label>
                <Input
                  id="review-response"
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  placeholder="Thank the guest…"
                />
              </label>
              <MutationError error={moderate.error} />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => moderate.mutate({ id: selected.id, status: ReviewModerationStatus.Rejected })}
                  disabled={moderate.isPending}
                >
                  <X className="mr-1 h-4 w-4" aria-hidden="true" /> Reject
                </Button>
                <Button
                  onClick={() =>
                    moderate.mutate({
                      id: selected.id,
                      status: ReviewModerationStatus.Approved,
                      response: responseDraft || undefined,
                    })
                  }
                  disabled={moderate.isPending}
                >
                  <Check className="mr-1 h-4 w-4" aria-hidden="true" /> Approve
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}