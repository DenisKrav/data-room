import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ListChildrenQueryDto } from '../folders/dto/list-children-query.dto';
import { SharesService } from './shares.service';

/**
 * Anonymous, token-gated access for public share links — no auth guard, the
 * token itself is the credential. Deliberately isolated from SharesController
 * so it's obvious at a glance which endpoints are reachable without login.
 */
@Public()
@Controller('shares/public/:token')
export class PublicSharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get()
  resolve(@Param('token') token: string) {
    return this.sharesService.resolvePublicToken(token);
  }

  @Get('folders/:folderId/children')
  getFolderChildren(
    @Param('token') token: string,
    @Param('folderId') folderId: string,
    @Query() query: ListChildrenQueryDto,
  ) {
    return this.sharesService.getPublicFolderChildren(token, folderId, query);
  }

  @Get('children')
  getRootChildren(@Param('token') token: string, @Query() query: ListChildrenQueryDto) {
    return this.sharesService.getPublicFolderChildren(token, undefined, query);
  }

  @Get('files/:fileId/view-url')
  getFileViewUrl(@Param('token') token: string, @Param('fileId') fileId: string) {
    return this.sharesService.getPublicFileViewUrl(token, fileId);
  }
}
