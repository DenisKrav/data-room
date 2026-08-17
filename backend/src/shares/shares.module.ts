import { Module } from '@nestjs/common';
import { FoldersModule } from '../folders/folders.module';
import { PublicSharesController } from './public-shares.controller';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [FoldersModule],
  controllers: [SharesController, PublicSharesController],
  providers: [SharesService],
})
export class SharesModule {}
