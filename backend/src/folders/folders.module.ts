import { Module } from '@nestjs/common';
import { FolderAggregatesService } from './folder-aggregates.service';
import { FolderListingService } from './folder-listing.service';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

@Module({
  controllers: [FoldersController],
  providers: [FoldersService, FolderAggregatesService, FolderListingService],
  exports: [FolderAggregatesService, FolderListingService],
})
export class FoldersModule {}
