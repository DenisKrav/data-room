'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Folder } from 'lucide-react';
import { getFolderChildren } from '@/lib/api/folders';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootFolderId: string;
  itemName: string;
  /** Folder currently containing the item — moving here would be a no-op. */
  currentParentId: string;
  onMove: (targetFolderId: string) => void;
  isMoving?: boolean;
}

export function MoveDialog({
  open,
  onOpenChange,
  rootFolderId,
  itemName,
  currentParentId,
  onMove,
  isMoving,
}: MoveDialogProps) {
  const [currentFolderId, setCurrentFolderId] = useState(rootFolderId);

  useEffect(() => {
    if (open) setCurrentFolderId(rootFolderId);
  }, [open, rootFolderId]);

  const { data, isLoading } = useQuery({
    queryKey: ['move-dialog-children', currentFolderId],
    queryFn: () => getFolderChildren(currentFolderId),
    enabled: open,
  });

  const isCurrentLocation = currentFolderId === currentParentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move &ldquo;{itemName}&rdquo;</DialogTitle>
          <DialogDescription>Choose a destination folder.</DialogDescription>
        </DialogHeader>

        {data && (
          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {data.breadcrumb.map((crumb, index) => (
              <Fragment key={crumb.id}>
                {index > 0 && <ChevronRight className="size-3.5" />}
                <button
                  className="max-w-[140px] truncate rounded px-1 hover:bg-muted hover:text-foreground"
                  onClick={() => setCurrentFolderId(crumb.id)}
                >
                  {crumb.name}
                </button>
              </Fragment>
            ))}
          </div>
        )}

        <div className="h-64 overflow-y-auto rounded-md border">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {data && data.folders.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No subfolders here</div>
          )}
          {data?.folders.map((folder) => (
            <button
              key={folder.id}
              className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onMove(currentFolderId)} disabled={isMoving || isCurrentLocation}>
            {isMoving ? 'Moving…' : isCurrentLocation ? 'Already here' : `Move here`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
