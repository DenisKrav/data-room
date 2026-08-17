'use client';

import { FileText, MoreHorizontal, Move, Pencil, Share2, Trash2 } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import type { FileItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListRow } from './list-row';

interface FileRowProps {
  file: FileItem;
  canWrite: boolean;
  onView: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function FileRow({
  file,
  canWrite,
  onView,
  onRename,
  onMove,
  onDelete,
  onShare,
}: FileRowProps) {
  return (
    <ListRow
      icon={FileText}
      title={file.name}
      subtitle={formatBytes(file.sizeBytes)}
      onClick={onView}
      trailing={
        canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${file.name}`}
                className="size-8 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <FileText className="size-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="size-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMove}>
                <Move className="size-4" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    />
  );
}