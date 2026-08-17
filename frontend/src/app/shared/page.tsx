'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { listSharedWithMe } from '@/lib/api/shares';
import { useSectionStore } from '@/lib/section-store';
import { AppShell } from '@/components/layout/app-shell';
import { SharedItemCard } from '@/components/shared-with-me/shared-item-card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SharedWithMePage() {
  const setSection = useSectionStore((s) => s.setSection);
  useEffect(() => setSection('shared'), [setSection]);

  const { data, isLoading } = useQuery({
    queryKey: ['shared-with-me'],
    queryFn: listSharedWithMe,
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Shared with me</h1>
        <p className="text-sm text-muted-foreground">
          Data rooms, folders, and files other people have shared with you — read-only.
        </p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-lg" />}

      {!isLoading && data && data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Share2 className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium">Nothing shared with you yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            When someone invites you to a data room, folder, or file, it will show up here.
          </p>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="rounded-lg border">
          {data.map((item) => (
            <SharedItemCard key={item.shareId} item={item} />
          ))}
        </div>
      )}
    </AppShell>
  );
}