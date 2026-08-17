'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getPublicFileViewUrl, resolvePublicShare } from '@/lib/api/shares';
import type { FileItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicFilePage() {
  const params = useParams<{ token: string; fileId: string }>();
  const router = useRouter();

  // resolvePublicShare also validates the token and returns file metadata for
  // FILE-type shares; for DATA_ROOM/FOLDER shares this file is a descendant
  // reached via folder browsing, so we still need it for the name/back state.
  const shareQuery = useQuery({
    queryKey: ['public-share-resolve', params.token],
    queryFn: () => resolvePublicShare(params.token),
  });

  const urlQuery = useQuery({
    queryKey: ['public-file-view-url', params.token, params.fileId],
    queryFn: () => getPublicFileViewUrl(params.token, params.fileId),
  });

  const fileName =
    shareQuery.data?.resourceType === 'FILE'
      ? (shareQuery.data.resource as FileItem).name
      : urlQuery.data?.name;

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/share/${params.token}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="size-4" />
        </Button>
        {fileName && <h1 className="truncate text-lg font-medium">{fileName}</h1>}
      </div>

      {urlQuery.isLoading && <Skeleton className="h-[75vh] w-full rounded-lg" />}

      {urlQuery.isError && (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          This link is invalid, has expired, or access has been revoked.
        </div>
      )}

      {urlQuery.data && (
        <iframe
          src={urlQuery.data.url}
          className="h-[75vh] w-full rounded-lg border bg-muted"
          title={fileName}
        />
      )}
    </div>
  );
}