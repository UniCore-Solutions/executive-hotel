'use client';

import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/form/Form';
import { TextareaField } from '@/components/form/fields/TextareaField';
import { useAdminForm } from '@/hooks/useAdminForm';
import { moderateReview } from '@/api/rest/endpoints/reviews';
import { moderateReviewSchema } from '@/schemas/reviews';
import { ReviewModerationStatus } from '@/graphql/generated/graphql';
import type { ReviewRow } from './columns';

/**
 * One dialog for both moderation actions — the backend action
 * (`POST /api/v1/admin/reviews/{id}/moderation`) and the request shape
 * (`{ status, response }`) are identical for approve and reject, only the
 * target `status` and the copy differ. `response` is the hotel's optional
 * public reply (`Review.responseText`) — the backend has no "reason
 * required to reject" rule, so this doesn't invent one.
 */
export function ModerateReviewDialog({
  review,
  action,
  open,
  onOpenChange,
  onModerated,
}: {
  review: ReviewRow | null;
  action: 'approve' | 'reject';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModerated: () => void;
}) {
  const targetStatus = action === 'approve' ? ReviewModerationStatus.Approved : ReviewModerationStatus.Rejected;

  const { form, submit, isSubmitting } = useAdminForm({
    schema: moderateReviewSchema,
    defaultValues: { response: review?.responseText ?? '' },
    mutationFn: (values) => moderateReview(review!.id, { status: targetStatus, response: values.response || undefined }),
    invalidates: 'reviews.moderate',
    successMessage:
      action === 'approve'
        ? `Review by ${review?.authorName ?? 'guest'} approved`
        : `Review by ${review?.authorName ?? 'guest'} rejected`,
    onSuccess: () => {
      onOpenChange(false);
      onModerated();
    },
  });

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'Approve' : 'Reject'} review by {review.authorName ?? 'this guest'}
          </DialogTitle>
          <DialogDescription>
            {action === 'approve'
              ? 'The review becomes visible on the hotel’s public page.'
              : 'The review stays hidden from the public page.'}
          </DialogDescription>
        </DialogHeader>

        <blockquote className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {review.comment ?? 'No comment left.'}
        </blockquote>

        <Form form={form} onSubmit={submit} className="mt-2 space-y-4">
          <TextareaField<z.infer<typeof moderateReviewSchema>>
            name="response"
            label="Public reply (optional)"
            rows={3}
            placeholder="A short reply from the hotel, shown alongside the review"
          />
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant={action === 'reject' ? 'destructive' : 'default'} loading={isSubmitting}>
              {action === 'approve' ? 'Approve review' : 'Reject review'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
