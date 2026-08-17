import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface AggregateDelta {
  fileCountDelta?: number;
  folderCountDelta?: number;
  totalSizeDelta?: bigint;
}

/**
 * Denormalized subtree aggregates (fileCount/folderCount/totalSize) live on every
 * Folder row and cover its full descendant subtree. Instead of recomputing them
 * with a recursive query on every read, we walk the ancestor chain (O(depth), via
 * the materialized `path` array) and apply a +/- delta whenever something is
 * created, deleted, or moved. See README "how it scales".
 */
@Injectable()
export class FolderAggregatesService {
  async applyDelta(
    tx: Prisma.TransactionClient,
    ancestorFolderIds: string[],
    delta: AggregateDelta,
  ): Promise<void> {
    if (ancestorFolderIds.length === 0) return;

    const data: Prisma.FolderUpdateManyMutationInput = {};
    if (delta.fileCountDelta) {
      data.fileCount = { increment: delta.fileCountDelta };
    }
    if (delta.folderCountDelta) {
      data.folderCount = { increment: delta.folderCountDelta };
    }
    if (delta.totalSizeDelta) {
      data.totalSize = { increment: delta.totalSizeDelta };
    }
    if (Object.keys(data).length === 0) return;

    await tx.folder.updateMany({
      where: { id: { in: ancestorFolderIds } },
      data,
    });
  }
}
