import { BadRequestException, Injectable } from '@nestjs/common';
import { Folder } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListChildrenQueryDto } from './dto/list-children-query.dto';

interface FileCursor {
  name: string;
  id: string;
}

/**
 * Pure folder-listing queries (children, file pagination, breadcrumb) with no
 * authorization baked in. FoldersService calls it after an authenticated
 * ownership/share check; the public-share flow calls it after validating a
 * public link token — same query logic, two different gatekeepers.
 */
@Injectable()
export class FolderListingService {
  constructor(private readonly prisma: PrismaService) {}

  async listChildren(
    folder: Folder,
    query: ListChildrenQueryDto,
    breadcrumbFloorId?: string,
    canWrite = false,
  ) {
    const limit = query.limit ?? 50;

    const [folders, filesPage, breadcrumb] = await Promise.all([
      this.prisma.folder.findMany({
        where: { parentId: folder.id },
        orderBy: { name: 'asc' },
      }),
      this.listFilesPage(folder.id, query.cursor, limit),
      this.getBreadcrumb(folder, breadcrumbFloorId),
    ]);

    return {
      folder,
      breadcrumb,
      folders,
      files: filesPage.items,
      nextCursor: filesPage.nextCursor,
      canWrite,
    };
  }

  /**
   * @param floorId When set, the breadcrumb is trimmed to start at this
   * ancestor instead of the data room root — used for public share links so
   * a recipient never sees folder names above what was actually shared.
   */
  private async getBreadcrumb(folder: Folder, floorId?: string) {
    let path = folder.path;
    if (floorId !== undefined) {
      path = floorId === folder.id ? [] : path.slice(path.indexOf(floorId));
    }

    if (path.length === 0) {
      return [{ id: folder.id, name: folder.name }];
    }

    const ancestors = await this.prisma.folder.findMany({
      where: { id: { in: path } },
      select: { id: true, name: true },
    });
    const nameById = new Map(ancestors.map((a) => [a.id, a.name]));
    return [
      ...path.map((id) => ({ id, name: nameById.get(id) ?? '…' })),
      { id: folder.id, name: folder.name },
    ];
  }

  private async listFilesPage(folderId: string, cursor: string | undefined, limit: number) {
    const cursorObj = cursor ? this.decodeCursor(cursor) : null;

    const files = await this.prisma.file.findMany({
      where: {
        folderId,
        ...(cursorObj
          ? {
              OR: [
                { name: { gt: cursorObj.name } },
                { name: cursorObj.name, id: { gt: cursorObj.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = files.length > limit;
    const items = hasMore ? files.slice(0, limit) : files;
    const last = items[items.length - 1];
    const nextCursor = hasMore && last
      ? this.encodeCursor({ name: last.name, id: last.id })
      : null;

    return { items, nextCursor };
  }

  private encodeCursor(cursor: FileCursor): string {
    return Buffer.from(JSON.stringify(cursor)).toString('base64url');
  }

  private decodeCursor(raw: string): FileCursor {
    try {
      return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid cursor');
    }
  }
}
