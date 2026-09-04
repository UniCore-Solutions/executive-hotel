'use client';

import { useState } from 'react';
import { Braces } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { parseAuditMetadata } from '@/lib/auditMetadata';

/** Renders one audit row's `metadata` — a "View" trigger opening a
    pretty-printed dialog, never raw unescaped text inline in the table.
    See lib/auditMetadata.ts for why this isn't a straight `JSON.parse`. */
export function MetadataCell({ metadata }: { metadata?: string | null }) {
  const [open, setOpen] = useState(false);
  const parsed = parseAuditMetadata(metadata);

  if (parsed.kind === 'empty') {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Braces className="size-3.5" />
        View
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit metadata</DialogTitle>
            <DialogDescription>Extra detail recorded with this audit entry.</DialogDescription>
          </DialogHeader>
          {parsed.kind === 'entries' ? (
            parsed.entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fields.</p>
            ) : (
              <dl className="divide-y divide-border rounded-md border border-border text-sm">
                {parsed.entries.map((entry, i) => (
                  <div key={`${entry.key}-${i}`} className="flex items-start justify-between gap-4 px-3 py-2">
                    <dt className="font-medium text-ink">{entry.key}</dt>
                    <dd className="min-w-0 break-all text-right font-mono text-xs text-muted-foreground">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            )
          ) : (
            <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap text-ink">
              {parsed.kind === 'json' ? parsed.pretty : parsed.text}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
