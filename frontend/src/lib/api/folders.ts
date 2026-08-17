import { api } from './client';
import type { DeletePreview, Folder, FolderChildren } from '../types';

export function getFolderChildren(folderId: string, cursor?: string) {
  return api
    .get<FolderChildren>(`/folders/${folderId}/children`, { params: cursor ? { cursor } : undefined })
    .then((r) => r.data);
}

export function createFolder(name: string, parentId: string) {
  return api.post<Folder>('/folders', { name, parentId }).then((r) => r.data);
}

export function renameFolder(id: string, name: string) {
  return api.patch<Folder>(`/folders/${id}`, { name }).then((r) => r.data);
}

export function moveFolder(id: string, targetParentId: string) {
  return api.post<Folder>(`/folders/${id}/move`, { targetParentId }).then((r) => r.data);
}

export function getFolderDeletePreview(id: string) {
  return api.get<DeletePreview>(`/folders/${id}/delete-preview`).then((r) => r.data);
}

export function deleteFolder(id: string) {
  return api.delete(`/folders/${id}`);
}
