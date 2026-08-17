'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { FileText, Folder as FolderIcon } from 'lucide-react';
import { getPublicFolderChildren } from '@/lib/api/shares';
import { formatBytes, formatItemCount } from '@/lib/format';
import { FolderBreadcrumbs } from '@/components/browser/breadcrumbs';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicFolderBrowserProps {
  token: string;
  folderId?: string;
}

export function PublicFolderBrowser({ token, folderId }: PublicFolderBrowserProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-folder-children', token, folderId],
    queryFn: () => getPublicFolderChildren(token, folderId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        This link is invalid, has expired, or access has been revoked.
      </div>
    );
  }

  const rootId = data.breadcrumb[0]?.id;
  const isEmpty = data.folders.length === 0 && data.files.length === 0;

  return (
    <div>
      <div className="mb-4">
        <FolderBreadcrumbs
          items={data.breadcrumb}
          hrefFor={(id) => (id === rootId ? `/share/${token}` : `/share/${token}/folders/${id}`)}
        />
      </div>

      <div className="rounded-lg border">
        {isEmpty && (
          <div className="py-16 text-center text-sm text-muted-foreground">This folder is empty.</div>
        )}

        {data.folders.map((folder) => (
          <Link
            key={folder.id}
            href={`/share/${token}/folders/${folder.id}`}
            className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
          >
            <FolderIcon className="size-5 shrink-0 fill-muted-foreground/20 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatItemCount(folder.fileCount, folder.folderCount)}
              </p>
            </div>
          </Link>
        ))}

        {data.files.map((file) => (
          <Link
            key={file.id}
            href={`/share/${token}/files/${file.id}`}
            className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
          >
            <FileText className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.sizeBytes)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}