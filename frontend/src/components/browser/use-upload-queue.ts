'use client';

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFile } from '@/lib/api/files';
import { getApiErrorMessage } from '@/lib/api/client';

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'done' | 'error';
  error?: string;
  isNewVersion?: boolean;
  version?: number;
}

export function useUploadQueue(folderId: string) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const queryClient = useQueryClient();

  const patch = useCallback((id: string, changes: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }, []);

  const runUpload = useCallback(
    async (id: string, file: File) => {
      try {
        const result = await uploadFile(folderId, file, (percent) => patch(id, { progress: percent }));
        patch(id, {
          status: 'done',
          progress: 100,
          isNewVersion: result.isNewVersion,
          version: result.version,
        });
        queryClient.invalidateQueries({ queryKey: ['folder-children', folderId] });
        if (result.isNewVersion) {
          queryClient.invalidateQueries({ queryKey: ['file-versions', result.id] });
          queryClient.invalidateQueries({ queryKey: ['file', result.id] });
        }
      } catch (err) {
        patch(id, { status: 'error', error: getApiErrorMessage(err, 'Upload failed') });
      }
    },
    [folderId, patch, queryClient],
  );

  const enqueue = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'uploading',
      }));
      setItems((prev) => [...prev, ...newItems]);
      newItems.forEach((item) => runUpload(item.id, item.file));
    },
    [runUpload],
  );

  const retry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;
      patch(id, { status: 'uploading', progress: 0, error: undefined });
      runUpload(id, item.file);
    },
    [items, patch, runUpload],
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== 'done'));
  }, []);

  return { items, enqueue, retry, dismiss, clearCompleted };
}
