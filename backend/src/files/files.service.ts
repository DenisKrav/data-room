import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { resolveConflictFreeName } from '../common/name-conflict.util';
import { PermissionsService } from '../common/permissions.service';
import { FolderAggregatesService } from '../folders/folder-aggregates.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { MoveFileDto } from './dto/move-file.dto';
import { SearchFilesQueryDto } from './dto/search-files-query.dto';
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

  /**
   * Uploading a name that exactly matches an existing file in the same folder
   * creates a new version of that file instead of an auto-suffixed "(1)"
   * copy — see README "how it scales" / extra credit notes. A name that
   * merely collides after normalization still goes through the usual
   * conflict-free-name path elsewhere (rename/move).
   */
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

    const existing = await this.prisma.file.findUnique({
      where: { folderId_name: { folderId: folder.id, name: file.originalname } },
    });

    const storageKey = `${folder.dataRoomId}/${randomUUID()}-${file.originalname}`;
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    const ancestorIds = [...folder.path, folder.id];

    if (existing) {
      const latest = await this.prisma.fileVersion.findFirst({
        where: { fileId: existing.id },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (latest?.version ?? 0) + 1;
      const sizeDelta = BigInt(file.size) - existing.sizeBytes;

      const updated = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.file.update({
          where: { id: existing.id },
          data: {
            storageKey,
            mimeType: file.mimetype,
            sizeBytes: BigInt(file.size),
            versions: {
              create: {
                version: nextVersion,
                storageKey,
                mimeType: file.mimetype,
                sizeBytes: BigInt(file.size),
              },
            },
          },
        });
        if (sizeDelta !== 0n) {
          await this.aggregates.applyDelta(tx, ancestorIds, { totalSizeDelta: sizeDelta });
        }
        return updated;
      });

      return { ...updated, isNewVersion: true, version: nextVersion };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          name: file.originalname,
          folderId: folder.id,
          dataRoomId: folder.dataRoomId,
          storageKey,
          mimeType: file.mimetype,
          sizeBytes: BigInt(file.size),
          versions: {
            create: { version: 1, storageKey, mimeType: file.mimetype, sizeBytes: BigInt(file.size) },
          },
        },
      });
      await this.aggregates.applyDelta(tx, ancestorIds, {
        fileCountDelta: 1,
        totalSizeDelta: BigInt(file.size),
      });
      return created;
    });

    return { ...created, isNewVersion: false, version: 1 };
  }

  async getOne(userId: string, fileId: string) {
    const file = await this.permissions.assertFileAccess(userId, fileId);
    return { ...file, canWrite: file.dataRoom.ownerId === userId };
  }

  async listVersions(userId: string, fileId: string) {
    await this.permissions.assertFileAccess(userId, fileId);
    return this.prisma.fileVersion.findMany({
      where: { fileId },
      orderBy: { version: 'desc' },
    });
  }

  async getVersionViewUrl(userId: string, fileId: string, version: number) {
    const file = await this.permissions.assertFileAccess(userId, fileId);
    const fileVersion = await this.prisma.fileVersion.findUnique({
      where: { fileId_version: { fileId, version } },
    });
    if (!fileVersion) {
      throw new NotFoundException('Version not found');
    }
    const url = await this.storage.createSignedUrl(fileVersion.storageKey, 300);
    return { url, name: file.name, mimeType: fileVersion.mimeType, version };
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

    const versions = await this.prisma.fileVersion.findMany({
      where: { fileId: file.id },
      select: { storageKey: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.file.delete({ where: { id: file.id } });
      await this.aggregates.applyDelta(tx, ancestorIds, {
        fileCountDelta: -1,
        totalSizeDelta: -file.sizeBytes,
      });
    });

    await this.storage.remove(versions.map((v) => v.storageKey));
  }

  async getViewUrl(userId: string, fileId: string) {
    const file = await this.permissions.assertFileAccess(userId, fileId);
    const url = await this.storage.createSignedUrl(file.storageKey, 300);
    return { url, name: file.name, mimeType: file.mimeType };
  }

  /** File-name search across an entire Data Room — see README "how it scales". */
  async searchInDataRoom(userId: string, dataRoomId: string, query: SearchFilesQueryDto) {
    await this.permissions.assertDataRoomAccess(userId, dataRoomId);

    const files = await this.prisma.file.findMany({
      where: {
        dataRoomId,
        name: { contains: query.q, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    if (files.length === 0) return [];

    const folderIds = [...new Set(files.map((f) => f.folderId))];
    const folders = await this.prisma.folder.findMany({
      where: { id: { in: folderIds } },
      select: { id: true, name: true, path: true },
    });
    const folderById = new Map(folders.map((f) => [f.id, f]));

    const ancestorIds = [...new Set(folders.flatMap((f) => f.path))];
    const ancestors = await this.prisma.folder.findMany({
      where: { id: { in: ancestorIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(ancestors.map((a) => [a.id, a.name]));

    return files.map((file) => {
      const folder = folderById.get(file.folderId);
      const folderPath = folder
        ? [...folder.path.map((id) => nameById.get(id) ?? '…'), folder.name].join(' / ')
        : '';
      return { ...file, folderPath };
    });
  }
}