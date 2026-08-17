import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PermissionsService } from '../common/permissions.service';
import { ListChildrenQueryDto } from '../folders/dto/list-children-query.dto';
import { FolderListingService } from '../folders/folder-listing.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { InviteDto } from './dto/invite.dto';
import { ResourceRefDto } from './dto/resource-ref.dto';

const ACTIVE_SHARE_INCLUDE = { dataRoom: true, folder: true, file: true } as const;
type ActivePublicShare = Prisma.ShareGetPayload<{ include: typeof ACTIVE_SHARE_INCLUDE }>;

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly listing: FolderListingService,
    private readonly storage: StorageService,
  ) {}

  // ---- Owner-side management -------------------------------------------

  async createPublicLink(userId: string, dto: ResourceRefDto) {
    await this.assertOwnership(userId, dto);

    const existing = await this.prisma.share.findFirst({
      where: {
        ownerId: userId,
        mode: 'PUBLIC_LINK',
        revokedAt: null,
        ...this.resourceWhere(dto),
      },
    });
    if (existing) return existing;

    return this.prisma.share.create({
      data: {
        resourceType: dto.resourceType,
        ownerId: userId,
        mode: 'PUBLIC_LINK',
        token: randomBytes(24).toString('base64url'),
        ...this.resourceIdField(dto),
      },
    });
  }

  async revokePublicLink(userId: string, dto: ResourceRefDto): Promise<void> {
    await this.assertOwnership(userId, dto);
    await this.prisma.share.updateMany({
      where: {
        ownerId: userId,
        mode: 'PUBLIC_LINK',
        revokedAt: null,
        ...this.resourceWhere(dto),
      },
      data: { revokedAt: new Date() },
    });
  }

  async invite(userId: string, dto: InviteDto) {
    await this.assertOwnership(userId, dto);

    let share = await this.prisma.share.findFirst({
      where: {
        ownerId: userId,
        mode: 'PERMISSIONED',
        revokedAt: null,
        ...this.resourceWhere(dto),
      },
    });
    if (!share) {
      share = await this.prisma.share.create({
        data: {
          resourceType: dto.resourceType,
          ownerId: userId,
          mode: 'PERMISSIONED',
          ...this.resourceIdField(dto),
        },
      });
    }

    const invited: string[] = [];
    const notFound: string[] = [];
    for (const rawEmail of dto.emails) {
      const email = rawEmail.toLowerCase();
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        notFound.push(rawEmail);
        continue;
      }
      if (user.id === userId) continue;

      await this.prisma.shareGrant.upsert({
        where: { shareId_userId: { shareId: share.id, userId: user.id } },
        create: { shareId: share.id, userId: user.id },
        update: {},
      });
      invited.push(rawEmail);
    }

    return { invited, notFound };
  }

  async revokeGrant(userId: string, grantId: string): Promise<void> {
    const grant = await this.prisma.shareGrant.findUnique({
      where: { id: grantId },
      include: { share: true },
    });
    if (!grant || grant.share.ownerId !== userId) {
      throw new NotFoundException('Share grant not found');
    }
    await this.prisma.shareGrant.delete({ where: { id: grantId } });
  }

  async listForResource(userId: string, dto: ResourceRefDto) {
    await this.assertOwnership(userId, dto);

    const shares = await this.prisma.share.findMany({
      where: { ownerId: userId, revokedAt: null, ...this.resourceWhere(dto) },
      include: {
        grants: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });

    const publicLink = shares.find((s) => s.mode === 'PUBLIC_LINK') ?? null;
    const permissioned = shares.find((s) => s.mode === 'PERMISSIONED');

    return {
      publicLink: publicLink ? { token: publicLink.token, createdAt: publicLink.createdAt } : null,
      grants:
        permissioned?.grants.map((g) => ({
          id: g.id,
          user: g.user,
          createdAt: g.createdAt,
        })) ?? [],
    };
  }

  async listSharedWithMe(userId: string) {
    const grants = await this.prisma.shareGrant.findMany({
      where: { userId, share: { revokedAt: null } },
      include: {
        share: {
          include: {
            dataRoom: { include: { rootFolder: true } },
            folder: true,
            file: true,
            owner: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return grants.map((g) => ({
      shareId: g.share.id,
      resourceType: g.share.resourceType,
      resource: g.share.dataRoom ?? g.share.folder ?? g.share.file,
      sharedBy: g.share.owner,
      sharedAt: g.createdAt,
    }));
  }

  // ---- Public link (unauthenticated) access ------------------------------

  async resolvePublicToken(token: string) {
    const share = await this.getActivePublicShare(token);
    return {
      resourceType: share.resourceType,
      resource: share.dataRoom ?? share.folder ?? share.file,
    };
  }

  async getPublicFolderChildren(
    token: string,
    folderId: string | undefined,
    query: ListChildrenQueryDto,
  ) {
    const share = await this.getActivePublicShare(token);
    if (share.resourceType === 'FILE') {
      throw new BadRequestException('This link points to a single file');
    }

    const scopeRootId =
      share.resourceType === 'DATA_ROOM' ? share.dataRoom!.rootFolderId! : share.folderId!;
    const targetFolderId = folderId ?? scopeRootId;

    const folder = await this.prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (!folder) throw new NotFoundException('Folder not found');

    const inScope = folder.id === scopeRootId || folder.path.includes(scopeRootId);
    if (!inScope) throw new ForbiddenException('Outside the shared scope');

    return this.listing.listChildren(folder, query, scopeRootId);
  }

  async getPublicFileViewUrl(token: string, fileId: string) {
    const share = await this.getActivePublicShare(token);
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { folder: true },
    });
    if (!file) throw new NotFoundException('File not found');

    let inScope: boolean;
    if (share.resourceType === 'FILE') {
      inScope = share.fileId === file.id;
    } else {
      const scopeRootId =
        share.resourceType === 'DATA_ROOM' ? share.dataRoom!.rootFolderId! : share.folderId!;
      inScope = file.folder.id === scopeRootId || file.folder.path.includes(scopeRootId);
    }
    if (!inScope) throw new ForbiddenException('Outside the shared scope');

    const url = await this.storage.createSignedUrl(file.storageKey, 300);
    return { url, name: file.name, mimeType: file.mimeType };
  }

  // ---- helpers -------------------------------------------------------------

  private async assertOwnership(userId: string, dto: ResourceRefDto) {
    switch (dto.resourceType) {
      case 'DATA_ROOM':
        return this.permissions.assertDataRoomAccess(userId, dto.resourceId, { write: true });
      case 'FOLDER':
        return this.permissions.assertFolderAccess(userId, dto.resourceId, { write: true });
      case 'FILE':
        return this.permissions.assertFileAccess(userId, dto.resourceId, { write: true });
    }
  }

  private resourceWhere(dto: ResourceRefDto) {
    return this.resourceIdField(dto);
  }

  private resourceIdField(dto: ResourceRefDto) {
    switch (dto.resourceType) {
      case 'DATA_ROOM':
        return { dataRoomId: dto.resourceId };
      case 'FOLDER':
        return { folderId: dto.resourceId };
      case 'FILE':
        return { fileId: dto.resourceId };
    }
  }

  private async getActivePublicShare(token: string): Promise<ActivePublicShare> {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: ACTIVE_SHARE_INCLUDE,
    });
    if (!share || share.revokedAt || share.mode !== 'PUBLIC_LINK') {
      throw new NotFoundException('This link is invalid or has been revoked');
    }
    return share;
  }
}
