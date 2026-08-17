import type { AxiosProgressEvent } from 'axios';
import { api } from './client';
import type { FileItem } from '../types';

export function uploadFile(
  folderId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append('file', file);

  return api
    .post<FileItem>(`/folders/${folderId}/files`, formData, {
      signal,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (!onProgress || !event.total) return;
        onProgress(Math.round((event.loaded / event.total) * 100));
      },
    })
    .then((r) => r.data);
}

export function getFile(id: string) {
  return api.get<FileItem>(`/files/${id}`).then((r) => r.data);
}

export function getFileViewUrl(id: string) {
  return api
    .get<{ url: string; name: string; mimeType: string }>(`/files/${id}/view-url`)
    .then((r) => r.data);
}

export function renameFile(id: string, name: string) {
  return api.patch<FileItem>(`/files/${id}`, { name }).then((r) => r.data);
}

export function moveFile(id: string, targetFolderId: string) {
  return api.post<FileItem>(`/files/${id}/move`, { targetFolderId }).then((r) => r.data);
}

export function deleteFile(id: string) {
  return api.delete(`/files/${id}`);
}
