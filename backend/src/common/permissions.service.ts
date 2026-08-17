import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessCheckOptions {
  /** Require write (owner-only) access instead of read access. */
  write?: boolean;
}

/**
 * Central place for "can this user touch this resource" checks. Read access is
 * owner OR covered by an active share (direct share on the resource, or on any
 * ancestor folder/data room — see ShareModule). Write access is owner-only for
 * now; extending to per-user EDITOR roles later only touches this class, not
 * the controllers that call it — see README "how it scales".
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertDataRoomAccess(
    userId: string,
    dataRoomId: string,
    opts: AccessCheckOptions = {},
  ) {
    const room = await this.prisma.dataRoom.findUnique({
      where: { id: dataRoomId },
    });
    if (!room) throw new NotFoundException('Data room not found');
    if (room.ownerId === userId) return room;
    if (opts.write) throw new ForbiddenException('Read-only access');

    const hasShare = await this.hasActiveShare(userId, { dataRoomId: room.id });
    if (!hasShare) throw new ForbiddenException('No access to this data room');
    return room;
  }

  async assertFolderAccess(
    userId: string,
    folderId: string,
    opts: AccessCheckOptions = {},
  ) {
    const folder = await this.prisma.folder.findUnique({
      where: { id: folderId },
      include: { dataRoom: true },
    });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.dataRoom.ownerId === userId) return folder;
    if (opts.write) throw new ForbiddenException('Read-only access');

    const ancestorFolderIds = [...folder.path, folder.id];
    const hasShare = await this.hasActiveShare(userId, {
      dataRoomId: folder.dataRoomId,
      folderIds: ancestorFolderIds,
    });
    if (!hasShare) throw new ForbiddenException('No access to this folder');
    return folder;
  }

  async assertFileAccess(
    userId: string,
    fileId: string,
    opts: AccessCheckOptions = {},
  ) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { folder: true, dataRoom: true },
    });
    if (!file) throw new NotFoundException('File not found');
    if (file.dataRoom.ownerId === userId) return file;
    if (opts.write) throw new ForbiddenException('Read-only access');

    const ancestorFolderIds = [...file.folder.path, file.folder.id];
    const hasShare = await this.hasActiveShare(userId, {
      dataRoomId: file.dataRoomId,
      folderIds: ancestorFolderIds,
      fileId: file.id,
    });
    if (!hasShare) throw new ForbiddenException('No access to this file');
    return file;
  }

  private async hasActiveShare(
    userId: string,
    scope: { dataRoomId: string; folderIds?: string[]; fileId?: string },
  ): Promise<boolean> {
    const count = await this.prisma.share.count({
      where: {
        revokedAt: null,
        mode: 'PERMISSIONED',
        grants: { some: { userId } },
        OR: [
          { dataRoomId: scope.dataRoomId },
          ...(scope.folderIds?.length
            ? [{ folderId: { in: scope.folderIds } }]
            : []),
          ...(scope.fileId ? [{ fileId: scope.fileId }] : []),
        ],
      },
    });
    return count > 0;
  }
}
