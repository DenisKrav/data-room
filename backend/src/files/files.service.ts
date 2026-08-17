import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { resolveConflictFreeName } from '../common/name-conflict.util';
import { PermissionsService } from '../common/permissions.service';
import { FolderAggregatesService } from '../folders/folder-aggregates.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MoveFileDto } from './dto/move-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly aggregates: FolderAggregatesService,
    private readonly storage: StorageService,
  ) {}

  async upload(userId: string, folderId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file was uploaded');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PDF files are supported');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('File exceeds the 25MB limit');
    }

    const folder = await this.permissions.assertFolderAccess(userId, folderId, {
      write: true,
    });

    const name = await resolveConflictFreeName(file.originalname, async (candidate) => {
      const existing = await this.prisma.file.findUnique({
        where: { folderId_name: { folderId: folder.id, name: candidate } },
      });
      return !!existing;
    });

    const storageKey = `${folder.dataRoomId}/${randomUUID()}-${name}`;
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    const ancestorIds = [...folder.path, folder.id];

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          name,
          folderId: folder.id,
          dataRoomId: folder.dataRoomId,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
        },
      });
      await this.aggregates.applyDelta(tx, ancestorIds, {
        fileCountDelta: 1,
        totalSizeDelta: BigInt(file.size),
      });
      return created;
    });
  }

  async getOne(userId: string, fileId: string) {
    const file = await this.permissions.assertFileAccess(userId, fileId);
    return { ...file, canWrite: file.dataRoom.ownerId === userId };
  }

  async rename(userId: string, fileId: string, dto: UpdateFileDto) {
    const file = await this.permissions.assertFileAccess(userId, fileId, {
      write: true,
    });

    const name = await resolveConflictFreeName(dto.name, async (candidate) => {
      const existing = await this.prisma.file.findFirst({
        where: { folderId: file.folderId, name: candidate, NOT: { id: file.id } },
      });
      return !!existing;
    });

    return this.prisma.file.update({ where: { id: file.id }, data: { name } });
  }

  async move(userId: string, fileId: string, dto: MoveFileDto) {
    const file = await this.permissions.assertFileAccess(userId, fileId, {
      write: true,
    });
    const target = await this.permissions.assertFolderAccess(
      userId,
      dto.targetFolderId,
      { write: true },
    );
    if (target.dataRoomId !== file.dataRoomId) {
      throw new BadRequestException('Cannot move a file to a different data room');
    }
    if (target.id === file.folderId) {
      return file;
    }

    const name = await resolveConflictFreeName(file.name, async (candidate) => {
      const existing = await this.prisma.file.findFirst({
        where: { folderId: target.id, name: candidate },
      });
      return !!existing;
    });

    const oldFolder = await this.prisma.folder.findUniqueOrThrow({
      where: { id: file.folderId },
    });
    const oldAncestors = [...oldFolder.path, oldFolder.id];
    const newAncestors = [...target.path, target.id];

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.file.update({
        where: { id: file.id },
        data: { name, folderId: target.id, dataRoomId: target.dataRoomId },
      });
      await this.aggregates.applyDelta(tx, oldAncestors, {
        fileCountDelta: -1,
        totalSizeDelta: -file.sizeBytes,
      });
      await this.aggregates.applyDelta(tx, newAncestors, {
        fileCountDelta: 1,
        totalSizeDelta: file.sizeBytes,
      });
      return updated;
    });
  }

  async remove(userId: string, fileId: string): Promise<void> {
    const file = await this.permissions.assertFileAccess(userId, fileId, {
      write: true,
    });
    const folder = await this.prisma.folder.findUniqueOrThrow({
      where: { id: file.folderId },
    });
    const ancestorIds = [...folder.path, folder.id];

    await this.prisma.$transaction(async (tx) => {
      await tx.file.delete({ where: { id: file.id } });
      await this.aggregates.applyDelta(tx, ancestorIds, {
        fileCountDelta: -1,
        totalSizeDelta: -file.sizeBytes,
      });
    });

    await this.storage.remove([file.storageKey]);
  }

  async getViewUrl(userId: string, fileId: string) {
    const file = await this.permissions.assertFileAccess(userId, fileId);
    const url = await this.storage.createSignedUrl(file.storageKey, 300);
    return { url, name: file.name, mimeType: file.mimeType };
  }
}
