'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { FolderPlus, Share2, Upload, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  deleteFolder,
  getFolderChildren,
  getFolderDeletePreview,
  moveFolder,
  renameFolder,
} from '@/lib/api/folders';
import { deleteFile, moveFile, renameFile } from '@/lib/api/files';
import { useSectionStore } from '@/lib/section-store';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderBreadcrumbs } from './breadcrumbs';
import { CreateFolderDialog } from './create-folder-dialog';
import { FileRow } from './file-row';
import { FolderRow } from './folder-row';
import { MoveDialog } from './move-dialog';
import { UploadQueuePanel } from './upload-queue-panel';
import { useUploadQueue } from './use-upload-queue';
import { RenameDialog } from '@/components/common/rename-dialog';
import { DeleteWithPreviewDialog } from '@/components/common/delete-with-preview-dialog';
import { ShareDialog } from '@/components/share/share-dialog';

type Target = { type: 'folder' | 'file'; id: string; name: string; parentId: string };

interface FolderBrowserProps {
  dataRoomId: string;
  folderId: string;
}

export function FolderBrowser({ dataRoomId, folderId }: FolderBrowserProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['folder-children', folderId],
    queryFn: () => getFolderChildren(folderId),
  });

  const setSection = useSectionStore((s) => s.setSection);
  useEffect(() => {
    if (data) setSection(data.canWrite ? 'rooms' : 'shared');
  }, [data, setSection]);

  const { items: uploadItems, enqueue, retry, dismiss, clearCompleted } = useUploadQueue(folderId);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    disabled: !data?.canWrite,
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (accepted, rejected) => {
      if (accepted.length > 0) enqueue(accepted);
      if (rejected.length > 0) {
        toast.error('Only PDF files are supported');
      }
    },
  });

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Target | null>(null);
  const [moveTarget, setMoveTarget] = useState<Target | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Target | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<Target | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    resourceType: 'DATA_ROOM' | 'FOLDER' | 'FILE';
    resourceId: string;
    resourceName: string;
  } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['folder-children', folderId] });

  const renameMutation = useMutation({
    mutationFn: (target: Target): Promise<unknown> =>
      target.type === 'folder' ? renameFolder(target.id, target.name) : renameFile(target.id, target.name),
    onSuccess: () => {
      invalidate();
      setRenameTarget(null);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not rename')),
  });

  const moveMutation = useMutation({
    mutationFn: ({
      target,
      targetFolderId,
    }: {
      target: Target;
      targetFolderId: string;
    }): Promise<unknown> =>
      target.type === 'folder'
        ? moveFolder(target.id, targetFolderId)
        : moveFile(target.id, targetFolderId),
    onSuccess: () => {
      invalidate();
      setMoveTarget(null);
      toast.success('Moved');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not move')),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      invalidate();
      setDeleteFolderTarget(null);
      toast.success('Folder deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete the folder')),
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => {
      invalidate();
      setDeleteFileTarget(null);
      toast.success('File deleted');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Could not delete the file')),
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
        This folder is unavailable. It may have been deleted or moved.
      </div>
    );
  }

  const isRoot = data.folder.parentId === null;
  const isEmpty = data.folders.length === 0 && data.files.length === 0;
  const rootFolderId = data.breadcrumb[0]?.id ?? folderId;

  return (
    <div {...getRootProps()} className="relative">
      <input {...getInputProps()} />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) enqueue(files);
          e.target.value = '';
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FolderBreadcrumbs
          items={data.breadcrumb}
          hrefFor={(id) => `/rooms/${dataRoomId}/folders/${id}`}
        />
        {data.canWrite && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setShareTarget(
                isRoot
                  ? { resourceType: 'DATA_ROOM', resourceId: dataRoomId, resourceName: data.folder.name }
                  : { resourceType: 'FOLDER', resourceId: folderId, resourceName: data.folder.name },
              )
            }
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="size-4" />
            New folder
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Upload
          </Button>
        </div>
        )}
      </div>

      <div className="relative rounded-lg border">
        {isDragActive && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5">
            <div className="flex flex-col items-center gap-2 text-primary">
              <UploadCloud className="size-8" />
              <p className="text-sm font-medium">Drop PDFs to upload</p>
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <UploadCloud className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">This folder is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.canWrite
                ? 'Drag and drop PDFs here, or use the buttons above.'
                : 'Nothing has been shared here yet.'}
            </p>
          </div>
        )}

        {data.folders.map((folder) => (
          <FolderRow
            key={folder.id}
            folder={folder}
            href={`/rooms/${dataRoomId}/folders/${folder.id}`}
            canWrite={data.canWrite}
            onRename={() =>
              setRenameTarget({ type: 'folder', id: folder.id, name: folder.name, parentId: folderId })
            }
            onMove={() =>
              setMoveTarget({ type: 'folder', id: folder.id, name: folder.name, parentId: folderId })
            }
            onDelete={() =>
              setDeleteFolderTarget({ type: 'folder', id: folder.id, name: folder.name, parentId: folderId })
            }
            onShare={() =>
              setShareTarget({ resourceType: 'FOLDER', resourceId: folder.id, resourceName: folder.name })
            }
          />
        ))}

        {data.files.map((file) => (
          <FileRow
            key={file.id}
            file={file}
            canWrite={data.canWrite}
            onView={() => router.push(`/rooms/${dataRoomId}/files/${file.id}`)}
            onRename={() =>
              setRenameTarget({ type: 'file', id: file.id, name: file.name, parentId: folderId })
            }
            onMove={() =>
              setMoveTarget({ type: 'file', id: file.id, name: file.name, parentId: folderId })
            }
            onDelete={() =>
              setDeleteFileTarget({ type: 'file', id: file.id, name: file.name, parentId: folderId })
            }
            onShare={() =>
              setShareTarget({ resourceType: 'FILE', resourceId: file.id, resourceName: file.name })
            }
          />
        ))}
      </div>

      <CreateFolderDialog open={createFolderOpen} onOpenChange={setCreateFolderOpen} parentId={folderId} />

      {renameTarget && (
        <RenameDialog
          open={!!renameTarget}
          onOpenChange={(open) => !open && setRenameTarget(null)}
          currentName={renameTarget.name}
          title={renameTarget.type === 'folder' ? 'Rename folder' : 'Rename file'}
          isLoading={renameMutation.isPending}
          onSubmit={(name) => renameMutation.mutate({ ...renameTarget, name })}
        />
      )}

      {moveTarget && (
        <MoveDialog
          open={!!moveTarget}
          onOpenChange={(open) => !open && setMoveTarget(null)}
          rootFolderId={rootFolderId}
          itemName={moveTarget.name}
          currentParentId={moveTarget.parentId}
          isMoving={moveMutation.isPending}
          onMove={(targetFolderId) => moveMutation.mutate({ target: moveTarget, targetFolderId })}
        />
      )}

      {deleteFolderTarget && (
        <DeleteWithPreviewDialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
          itemName={deleteFolderTarget.name}
          itemLabel="folder"
          fetchPreview={() => getFolderDeletePreview(deleteFolderTarget.id)}
          onConfirm={() => deleteFolderMutation.mutate(deleteFolderTarget.id)}
          isDeleting={deleteFolderMutation.isPending}
        />
      )}

      {deleteFileTarget && (
        <AlertDialog open={!!deleteFileTarget} onOpenChange={(open) => !open && setDeleteFileTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete &ldquo;{deleteFileTarget.name}&rdquo;?</AlertDialogTitle>
              <AlertDialogDescription>This action can&apos;t be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setDeleteFileTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteFileMutation.mutate(deleteFileTarget.id)}
                disabled={deleteFileMutation.isPending}
              >
                {deleteFileMutation.isPending ? 'Deleting…' : 'Delete'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {shareTarget && (
        <ShareDialog
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          resourceType={shareTarget.resourceType}
          resourceId={shareTarget.resourceId}
          resourceName={shareTarget.resourceName}
        />
      )}

      <UploadQueuePanel
        items={uploadItems}
        onRetry={retry}
        onDismiss={dismiss}
        onDismissAll={clearCompleted}
      />
    </div>
  );
}
