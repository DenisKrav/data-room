import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { InviteDto } from './dto/invite.dto';
import { ResourceRefDto } from './dto/resource-ref.dto';
import { SharesService } from './shares.service';

@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Get('shared-with-me')
  listSharedWithMe(@CurrentUser() user: AuthenticatedUser) {
    return this.sharesService.listSharedWithMe(user.id);
  }

  @Get('resource')
  listForResource(@CurrentUser() user: AuthenticatedUser, @Query() dto: ResourceRefDto) {
    return this.sharesService.listForResource(user.id, dto);
  }

  @Post('public-link')
  createPublicLink(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResourceRefDto) {
    return this.sharesService.createPublicLink(user.id, dto);
  }

  @Delete('public-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokePublicLink(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResourceRefDto) {
    return this.sharesService.revokePublicLink(user.id, dto);
  }

  @Post('invite')
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteDto) {
    return this.sharesService.invite(user.id, dto);
  }

  @Delete('grants/:grantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeGrant(@CurrentUser() user: AuthenticatedUser, @Param('grantId') grantId: string) {
    return this.sharesService.revokeGrant(user.id, grantId);
  }
}
