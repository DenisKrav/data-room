import { Injectable } from '@nestjs/common';
import { PermissionsService } from '../common/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';

@Injectable()
export class DataRoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly storage: StorageService,
  ) {}

  async create(ownerId: string, dto: CreateDataRoomDto) {
    return this.prisma.$transaction(async (tx) => {
      const dataRoom = await tx.dataRoom.create({
        data: { name: dto.name, ownerId },
      });
      const rootFolder = await tx.folder.create({
        data: {
          name: dto.name,
          dataRoomId: dataRoom.id,
          parentId: null,
          path: [],
        },
      });
      return tx.dataRoom.update({
        where: { id: dataRoom.id },
        data: { rootFolderId: rootFolder.id },
        include: { rootFolder: true },
      });
    });
  }

  async listOwned(ownerId: string) {
    return this.prisma.dataRoom.findMany({
      where: { ownerId },
      include: { rootFolder: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(userId: string, id: string) {
    const room = await this.permissions.assertDataRoomAccess(userId, id);
    return this.prisma.dataRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: { rootFolder: true },
    });
  }

  async rename(userId: string, id: string, dto: UpdateDataRoomDto) {
    await this.permissions.assertDataRoomAccess(userId, id, { write: true });
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.dataRoom.update({
        where: { id },
        data: { name: dto.name },
      });
      if (room.rootFolderId) {
        await tx.folder.update({
          where: { id: room.rootFolderId },
          data: { name: dto.name },
        });
      }
      return room;
    });
  }

  async getDeletePreview(userId: string, id: string) {
    const room = await this.permissions.assertDataRoomAccess(userId, id, {
      write: true,
    });
    if (!room.rootFolderId) {
      return { folderCount: 0, fileCount: 0, totalSizeBytes: '0' };
    }
    const root = await this.prisma.folder.findUniqueOrThrow({
      where: { id: room.rootFolderId },
    });
    return {
      folderCount: root.folderCount,
      fileCount: root.fileCount,
      totalSizeBytes: root.totalSize.toString(),
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.permissions.assertDataRoomAccess(userId, id, { write: true });

    const files = await this.prisma.file.findMany({
      where: { dataRoomId: id },
      select: { storageKey: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // Break the DataRoom -> root Folder FK first so the folder subtree can be
      // deleted without a dangling reference (Folder -> DataRoom cascade handles
      // the rest, including nested folders and files).
      await tx.dataRoom.update({ where: { id }, data: { rootFolderId: null } });
      await tx.folder.deleteMany({ where: { dataRoomId: id } });
      await tx.dataRoom.delete({ where: { id } });
    });

    if (files.length > 0) {
      await this.storage.remove(files.map((f) => f.storageKey));
    }
  }
}
