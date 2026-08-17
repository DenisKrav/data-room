'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { getFile, getFileVersionViewUrl, getFileViewUrl } from '@/lib/api/files';
import { useSectionStore } from '@/lib/section-store';
import { AppShell } from '@/components/layout/app-shell';
import { VersionHistoryMenu } from '@/components/browser/version-history-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The single place files are viewed from — folder browsing and "shared with
 * me" both navigate here instead of opening a modal, so every file has one
 * real URL and one rendering path. Access is resolved purely via the
 * file-level permission check (assertFileAccess), which also covers files
 * shared on their own with no folder access granted.
 */
export default function FilePage() {
  const params = useParams<{ roomId: string; fileId: string }>();
  const router = useRouter();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const fileQuery = useQuery({
    queryKey: ['file', params.fileId],
    queryFn: () => getFile(params.fileId),
    retry: false,
  });

  const urlQuery = useQuery({
    queryKey: ['file-view-url', params.fileId, selectedVersion],
    queryFn: () =>
      selectedVersion === null
        ? getFileViewUrl(params.fileId)
        : getFileVersionViewUrl(params.fileId, selectedVersion),
    enabled: fileQuery.isSuccess,
  });

  const setSection = useSectionStore((s) => s.setSection);
  useEffect(() => {
    if (fileQuery.data) setSection(fileQuery.data.canWrite ? 'rooms' : 'shared');
  }, [fileQuery.data, setSection]);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/rooms');
    }
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-4" />
          </Button>
          {fileQuery.data && (
            <h1 className="truncate text-lg font-medium">{fileQuery.data.name}</h1>
          )}
        </div>
        {fileQuery.data && (
          <VersionHistoryMenu
            fileId={params.fileId}
            selectedVersion={selectedVersion}
            onSelect={setSelectedVersion}
          />
        )}
      </div>

      {selectedVersion !== null && (
        <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Badge variant="outline" className="border-amber-400 text-amber-800 dark:text-amber-200">
            Version {selectedVersion}
          </Badge>
          <span>You&apos;re viewing an older version of this file.</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-amber-900 underline dark:text-amber-200"
            onClick={() => setSelectedVersion(null)}
          >
            Back to latest
          </Button>
        </div>
      )}

      {fileQuery.isLoading && <Skeleton className="h-[75vh] w-full rounded-lg" />}

      {fileQuery.isError && (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          This file is unavailable. It may have been deleted, moved, or access may have been
          revoked.
        </div>
      )}

      {urlQuery.data && (
        <iframe
          src={urlQuery.data.url}
          className="h-[75vh] w-full rounded-lg border bg-muted"
          title={fileQuery.data?.name}
        />
      )}
    </AppShell>
  );
}