export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface DataRoom {
  id: string;
  name: string;
  ownerId: string;
  rootFolderId: string | null;
  createdAt: string;
  updatedAt: string;
  rootFolder?: Folder;
}

export interface Folder {
  id: string;
  name: string;
  dataRoomId: string;
  parentId: string | null;
  path: string[];
  fileCount: number;
  folderCount: number;
  totalSize: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  folderId: string;
  dataRoomId: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
  updatedAt: string;
  /** Only populated by GET /files/:id — owner vs read-only-via-share. */
  canWrite?: boolean;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  mimeType: string;
  sizeBytes: string;
  createdAt: string;
}

export interface SearchResultFile extends FileItem {
  /** e.g. "Acme Room / Legal / Contracts" — resolved ancestor names. */
  folderPath: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FolderChildren {
  folder: Folder;
  breadcrumb: BreadcrumbItem[];
  folders: Folder[];
  files: FileItem[];
  nextCursor: string | null;
  canWrite: boolean;
}

export interface DeletePreview {
  folderCount: number;
  fileCount: number;
  totalSizeBytes: string;
}

export type ShareResourceType = 'DATA_ROOM' | 'FOLDER' | 'FILE';

export interface ShareGrant {
  id: string;
  user: User;
  createdAt: string;
}

export interface ResourceShareState {
  publicLink: { token: string; createdAt: string } | null;
  grants: ShareGrant[];
}

export interface SharedWithMeItem {
  shareId: string;
  resourceType: ShareResourceType;
  resource: DataRoom | Folder | FileItem;
  sharedBy: { name: string | null; email: string };
  sharedAt: string;
}

export interface PublicShareResolve {
  resourceType: ShareResourceType;
  resource: DataRoom | Folder | FileItem;
}

export interface ApiErrorBody {
  message: string | string[];
  error?: string;
  statusCode: number;
}
