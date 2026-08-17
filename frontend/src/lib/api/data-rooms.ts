import { api } from './client';
import type { DataRoom, DeletePreview } from '../types';

export function listDataRooms() {
  return api.get<DataRoom[]>('/data-rooms').then((r) => r.data);
}

export function getDataRoom(id: string) {
  return api.get<DataRoom>(`/data-rooms/${id}`).then((r) => r.data);
}

export function createDataRoom(name: string) {
  return api.post<DataRoom>('/data-rooms', { name }).then((r) => r.data);
}

export function renameDataRoom(id: string, name: string) {
  return api.patch<DataRoom>(`/data-rooms/${id}`, { name }).then((r) => r.data);
}

export function getDataRoomDeletePreview(id: string) {
  return api.get<DeletePreview>(`/data-rooms/${id}/delete-preview`).then((r) => r.data);
}

export function deleteDataRoom(id: string) {
  return api.delete(`/data-rooms/${id}`);
}
