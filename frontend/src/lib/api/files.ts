import type { AxiosProgressEvent } from 'axios';
import { api } from './client';
import type { FileItem, FileVersion, SearchResultFile } from '../types';

export interface UploadResult extends FileItem {
  isNewVersion: boolean;
  version: number;
}

export function uploadFile(
  folderId: string,
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append('file', file);

  return api
    .post<UploadResult>(`/folders/${folderId}/files`, formData, {
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

export function getFileVersions(id: string) {
  return api.get<FileVersion[]>(`/files/${id}/versions`).then((r) => r.data);
}

export function getFileVersionViewUrl(id: string, version: number) {
  return api
    .get<{ url: string; name: string; mimeType: string; version: number }>(
      `/files/${id}/versions/${version}/view-url`,
    )
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

export function searchFiles(dataRoomId: string, q: string) {
  return api
    .get<SearchResultFile[]>(`/data-rooms/${dataRoomId}/files/search`, { params: { q } })
    .then((r) => r.data);
}