import { api } from './client';
import type {
  FolderChildren,
  PublicShareResolve,
  ResourceShareState,
  ShareResourceType,
  SharedWithMeItem,
} from '../types';

export function getResourceShareState(resourceType: ShareResourceType, resourceId: string) {
  return api
    .get<ResourceShareState>('/shares/resource', { params: { resourceType, resourceId } })
    .then((r) => r.data);
}

export function createPublicLink(resourceType: ShareResourceType, resourceId: string) {
  return api
    .post<{ token: string }>('/shares/public-link', { resourceType, resourceId })
    .then((r) => r.data);
}

export function revokePublicLink(resourceType: ShareResourceType, resourceId: string) {
  return api.delete('/shares/public-link', { data: { resourceType, resourceId } });
}

export function inviteToShare(
  resourceType: ShareResourceType,
  resourceId: string,
  emails: string[],
) {
  return api
    .post<{ invited: string[]; notFound: string[] }>('/shares/invite', {
      resourceType,
      resourceId,
      emails,
    })
    .then((r) => r.data);
}

export function revokeGrant(grantId: string) {
  return api.delete(`/shares/grants/${grantId}`);
}

export function listSharedWithMe() {
  return api.get<SharedWithMeItem[]>('/shares/shared-with-me').then((r) => r.data);
}

// ---- public (unauthenticated) ----

export function resolvePublicShare(token: string) {
  return api.get<PublicShareResolve>(`/shares/public/${token}`).then((r) => r.data);
}

export function getPublicFolderChildren(token: string, folderId?: string, cursor?: string) {
  const path = folderId
    ? `/shares/public/${token}/folders/${folderId}/children`
    : `/shares/public/${token}/children`;
  return api.get<FolderChildren>(path, { params: cursor ? { cursor } : undefined }).then((r) => r.data);
}

export function getPublicFileViewUrl(token: string, fileId: string) {
  return api
    .get<{ url: string; name: string; mimeType: string }>(
      `/shares/public/${token}/files/${fileId}/view-url`,
    )
    .then((r) => r.data);
}
