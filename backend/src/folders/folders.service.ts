import { BadRequestException, Injectable } from '@nestjs/common';
import { PermissionsService } from '../common/permissions.service';
import { resolveConflictFreeName } from '../common/name-conflict.util';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { ListChildrenQueryDto } from './dto/list-children-query.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FolderAggregatesService } from './folder-aggregates.service';
import { FolderListingService } from './folder-listing.service';

@Injectable()
export class FoldersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly aggregates: FolderAggregatesService,
    private readonly storage: StorageService,
    private readonly listing: FolderListingService,
  ) {}

  async create(userId: string, dto: CreateFolderDto) {
    const parent = await this.permissions.assertFolderAccess(userId, dto.parentId, {
      write: true,
    });

    const name = await resolveConflictFreeName(dto.name, async (candidate) => {
      const existing = await this.prisma.folder.findUnique({
        where: { parentId_name: { parentId: parent.id, name: candidate } },
      });
      return !!existing;
    });

    const path = [...parent.path, parent.id];

    return this.prisma.$transaction(async (tx) => {
      const folder = await tx.folder.create({
        data: { name, parentId: parent.id, dataRoomId: parent.dataRoomId, path },
      });
      await this.aggregates.applyDelta(tx, path, { folderCountDelta: 1 });
      return folder;
    });
  }

  async getChildren(userId: string, folderId: string, query: ListChildrenQueryDto) {
    const folder = await this.permissions.assertFolderAccess(userId, folderId);
    const canWrite = folder.dataRoom.ownerId === userId;
    return this.listing.listChildren(folder, query, undefined, canWrite);
  }

  async rename(userId: string, folderId: string, dto: UpdateFolderDto) {
    const folder = await this.permissions.assertFolderAccess(userId, folderId, {
      write: true,
    });
    if (folder.parentId === null) {
      throw new BadRequestException(
        'Rename the data room instead of its root folder',
      );
    }

    const name = await resolveConflictFreeName(dto.name, async (candidate) => {
      const existing = await this.prisma.folder.findFirst({
        where: { parentId: folder.parentId, name: candidate, NOT: { id: folder.id } },
      });
      return !!existing;
    });

    return this.prisma.folder.update({ where: { id: folder.id }, data: { name } });
  }

  async move(userId: string, folderId: string, dto: MoveFolderDto) {
    const folder = await this.permissions.assertFolderAccess(userId, folderId, {
      write: true,
    });
    if (folder.parentId === null) {
      throw new BadRequestException('Cannot move the root folder');
    }

    const target = await this.permissions.assertFolderAccess(
      userId,
      dto.targetParentId,
      { write: true },
    );
    if (target.dataRoomId !== folder.dataRoomId) {
      throw new BadRequestException('Cannot move a folder to a different data room');
    }
    if (target.id === folder.id || [...target.path, target.id].includes(folder.id)) {
      throw new BadRequestException(
        'Cannot move a folder into itself or one of its descendants',
      );
    }
    if (target.id === folder.parentId) {
      return folder;
    }

    const name = await resolveConflictFreeName(folder.name, async (candidate) => {
      const existing = await this.prisma.folder.findFirst({
        where: { parentId: target.id, name: candidate },
      });
      return !!existing;
    });

    const oldAncestors = folder.path;
    const newAncestors = [...target.path, target.id];
    const descendantFolders = await this.prisma.folder.findMany({
      where: { path: { has: folder.id } },
    });

    return this.prisma.$transaction(async (tx) => {
      await tx.folder.update({
        where: { id: folder.id },
        data: { name, parentId: target.id, path: newAncestors },
      });

      for (const descendant of descendantFolders) {
        const relativeSuffix = descendant.path.slice(oldAncestors.length + 1);
        await tx.folder.update({
          where: { id: descendant.id },
          data: { path: [...newAncestors, folder.id, ...relativeSuffix] },
        });
      }

      await this.aggregates.applyDelta(tx, oldAncestors, {
        folderCountDelta: -(1 + folder.folderCount),
        fileCountDelta: -folder.fileCount,
        totalSizeDelta: -folder.totalSize,
      });
      await this.aggregates.applyDelta(tx, newAncestors, {
        folderCountDelta: 1 + folder.folderCount,
        fileCountDelta: folder.fileCount,
        totalSizeDelta: folder.totalSize,
      });

      return tx.folder.findUniqueOrThrow({ where: { id: folder.id } });
    });
  }

  async getDeletePreview(userId: string, folderId: string) {
    const folder = await this.permissions.assertFolderAccess(userId, folderId, {
      write: true,
    });
    return {
      folderCount: folder.folderCount,
      fileCount: folder.fileCount,
      totalSizeBytes: folder.totalSize.toString(),
    };
  }

  async remove(userId: string, folderId: string): Promise<void> {
    const folder = await this.permissions.assertFolderAccess(userId, folderId, {
      write: true,
    });
    if (folder.parentId === null) {
      throw new BadRequestException(
        'Cannot delete the root folder directly — delete the data room instead',
      );
    }

    const descendantFolders = await this.prisma.folder.findMany({
      where: { path: { has: folder.id } },
      select: { id: true },
    });
    const allFolderIds = [folder.id, ...descendantFolders.map((f) => f.id)];

    const files = await this.prisma.file.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { storageKey: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.folder.delete({ where: { id: folder.id } });
      await this.aggregates.applyDelta(tx, folder.path, {
        folderCountDelta: -(1 + folder.folderCount),
        fileCountDelta: -folder.fileCount,
        totalSizeDelta: -folder.totalSize,
      });
    });

    if (files.length > 0) {
      await this.storage.remove(files.map((f) => f.storageKey));
    }
  }
}
