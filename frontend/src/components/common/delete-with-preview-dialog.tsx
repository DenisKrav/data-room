'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { formatBytes, formatItemCount } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { DeletePreview } from '@/lib/types';

interface DeleteWithPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  /** e.g. "data room" or "folder" — used in copy. */
  itemLabel: string;
  fetchPreview: () => Promise<DeletePreview>;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteWithPreviewDialog({
  open,
  onOpenChange,
  itemName,
  itemLabel,
  fetchPreview,
  onConfirm,
  isDeleting,
}: DeleteWithPreviewDialogProps) {
  const previewQuery = useQuery({
    queryKey: ['delete-preview', itemLabel, itemName, open],
    queryFn: fetchPreview,
    enabled: open,
  });

  const preview = previewQuery.data;
  const hasContents = preview && (preview.fileCount > 0 || preview.folderCount > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete &ldquo;{itemName}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {previewQuery.isLoading && <p>Checking what&apos;s inside…</p>}
              {hasContents && preview && (
                <p>
                  This {itemLabel} contains{' '}
                  <strong className="text-foreground">
                    {formatItemCount(preview.fileCount, preview.folderCount)}
                  </strong>{' '}
                  ({formatBytes(preview.totalSizeBytes)}). Deleting it will permanently remove
                  everything inside — this can&apos;t be undone.
                </p>
              )}
              {preview && !hasContents && (
                <p>This action can&apos;t be undone.</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
