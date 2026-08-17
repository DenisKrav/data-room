'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { resolvePublicShare } from '@/lib/api/shares';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicFolderBrowser } from './public-folder-browser';

interface PublicShareViewProps {
  token: string;
  folderId?: string;
}

export function PublicShareView({ token, folderId }: PublicShareViewProps) {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-share-resolve', token],
    queryFn: () => resolvePublicShare(token),
  });

  // A file-only share has no folder to browse — its one file IS the
  // destination, so send the visitor straight to the file page instead of
  // duplicating the viewer here.
  useEffect(() => {
    if (data?.resourceType === 'FILE') {
      router.replace(`/share/${token}/files/${data.resource.id}`);
    }
  }, [data, router, token]);

  if (isLoading || data?.resourceType === 'FILE') {
    return (
      <div className="mx-auto max-w-3xl space-y-2 px-4 py-10">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <ShieldAlert className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-lg font-medium">This link isn&apos;t available</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been revoked by the owner, or the URL is incorrect.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PublicFolderBrowser token={token} folderId={folderId} />
    </div>
  );
}