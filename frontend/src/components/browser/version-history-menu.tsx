'use client';

import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { getFileVersions } from '@/lib/api/files';
import { formatBytes } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VersionHistoryMenuProps {
  fileId: string;
  /** null means "viewing the latest version". */
  selectedVersion: number | null;
  onSelect: (version: number | null) => void;
}

/**
 * Uploading a file with the same name as an existing one creates a new
 * version instead of a separate "(1)" copy (see backend FilesService.upload)
 * — this menu is how you get back to an older one. Renders nothing for a
 * file that only has one version, since there's nothing to pick between.
 */
export function VersionHistoryMenu({ fileId, selectedVersion, onSelect }: VersionHistoryMenuProps) {
  const { data } = useQuery({
    queryKey: ['file-versions', fileId],
    queryFn: () => getFileVersions(fileId),
  });

  if (!data || data.length <= 1) return null;

  const latestVersion = data[0]?.version;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="size-4" />
          Versions ({data.length})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Version history</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {data.map((v) => {
          const isViewing = (selectedVersion ?? latestVersion) === v.version;
          return (
            <DropdownMenuItem
              key={v.id}
              onClick={() => onSelect(v.version === latestVersion ? null : v.version)}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Version {v.version}
                    {v.version === latestVersion && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (latest)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(v.sizeBytes)} · {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                {isViewing && <span className="shrink-0 text-xs font-medium text-primary">Viewing</span>}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}