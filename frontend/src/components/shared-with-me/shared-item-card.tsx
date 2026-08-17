'use client';

import { FileText, Folder as FolderIcon, Vault } from 'lucide-react';
import { formatBytes, formatItemCount } from '@/lib/format';
import type { DataRoom, FileItem, Folder, SharedWithMeItem } from '@/lib/types';
import { ListRow } from '@/components/browser/list-row';

function resourceHref(item: SharedWithMeItem): string {
  switch (item.resourceType) {
    case 'DATA_ROOM': {
      const room = item.resource as DataRoom;
      return room.rootFolderId ? `/rooms/${room.id}/folders/${room.rootFolderId}` : '#';
    }
    case 'FOLDER': {
      const folder = item.resource as Folder;
      return `/rooms/${folder.dataRoomId}/folders/${folder.id}`;
    }
    case 'FILE': {
      const file = item.resource as FileItem;
      // Not /folders/:folderId — a file-only share doesn't grant folder access.
      return `/rooms/${file.dataRoomId}/files/${file.id}`;
    }
  }
}

function resourceIcon(item: SharedWithMeItem) {
  if (item.resourceType === 'DATA_ROOM') return Vault;
  if (item.resourceType === 'FOLDER') return FolderIcon;
  return FileText;
}

function resourceMeta(item: SharedWithMeItem): string {
  if (item.resourceType === 'DATA_ROOM') {
    const root = (item.resource as DataRoom).rootFolder;
    return root ? `${formatItemCount(root.fileCount, root.folderCount)} · ${formatBytes(root.totalSize)}` : '—';
  }
  if (item.resourceType === 'FOLDER') {
    const folder = item.resource as Folder;
    return `${formatItemCount(folder.fileCount, folder.folderCount)} · ${formatBytes(folder.totalSize)}`;
  }
  return formatBytes((item.resource as FileItem).sizeBytes);
}

export function SharedItemCard({ item }: { item: SharedWithMeItem }) {
  return (
    <ListRow
      icon={resourceIcon(item)}
      iconClassName={item.resourceType === 'FOLDER' ? 'fill-muted-foreground/20' : undefined}
      title={item.resource.name}
      subtitle={`${resourceMeta(item)} · Shared by ${item.sharedBy.name ?? item.sharedBy.email}`}
      href={resourceHref(item)}
    />
  );
}