'use client';

import { Folder as FolderIcon, MoreHorizontal, Move, Pencil, Share2, Trash2 } from 'lucide-react';
import { formatItemCount } from '@/lib/format';
import type { Folder } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListRow } from './list-row';

interface FolderRowProps {
  folder: Folder;
  href: string;
  canWrite: boolean;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function FolderRow({
  folder,
  href,
  canWrite,
  onRename,
  onMove,
  onDelete,
  onShare,
}: FolderRowProps) {
  return (
    <ListRow
      icon={FolderIcon}
      iconClassName="fill-muted-foreground/20"
      title={folder.name}
      subtitle={formatItemCount(folder.fileCount, folder.folderCount)}
      href={href}
      trailing={
        canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`More actions for ${folder.name}`}
                className="size-8 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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