'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Pencil, Trash2, Vault } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteDataRoom,
  getDataRoomDeletePreview,
  renameDataRoom,
} from '@/lib/api/data-rooms';
import { getApiErrorMessage } from '@/lib/api/client';
import { formatBytes, formatItemCount } from '@/lib/format';
import type { DataRoom } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RenameDialog } from '@/components/common/rename-dialog';
import { DeleteWithPreviewDialog } from '@/components/common/delete-with-preview-dialog';

export function RoomCard({ room }: { room: DataRoom }) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameDataRoom(room.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] });
      setRenameOpen(false);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not rename the data room')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDataRoom(room.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-rooms'] });
      setDeleteOpen(false);
      toast.success(`"${room.name}" was deleted`);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete the data room')),
  });

  const root = room.rootFolder;

  return (
    <Card className="group relative gap-3 p-4 transition-shadow hover:shadow-md">
      <Link
        href={room.rootFolderId ? `/rooms/${room.id}/folders/${room.rootFolderId}` : '#'}
        className="flex items-start gap-3"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Vault className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{room.name}</p>
          <p className="text-xs text-muted-foreground">
            {root ? formatItemCount(root.fileCount, root.folderCount) : '—'}
            {root ? ` · ${formatBytes(root.totalSize)}` : ''}
          </p>
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenameOpen(true)}>
            <Pencil className="size-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        currentName={room.name}
        title="Rename data room"
        isLoading={renameMutation.isPending}
        onSubmit={(name) => renameMutation.mutate(name)}
      />
      <DeleteWithPreviewDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemName={room.name}
        itemLabel="data room"
        fetchPreview={() => getDataRoomDeletePreview(room.id)}
        onConfirm={() => deleteMutation.mutate()}
        isDeleting={deleteMutation.isPending}
      />
    </Card>
  );
}
