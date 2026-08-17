import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateFolderDto } from './dto/create-folder.dto';
import { ListChildrenQueryDto } from './dto/list-children-query.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FoldersService } from './folders.service';

@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(user.id, dto);
  }

  @Get(':id/children')
  getChildren(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListChildrenQueryDto,
  ) {
    return this.foldersService.getChildren(user.id, id, query);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.foldersService.rename(user.id, id, dto);
  }

  @Post(':id/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveFolderDto,
  ) {
    return this.foldersService.move(user.id, id, dto);
  }

  @Get(':id/delete-preview')
  getDeletePreview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.foldersService.getDeletePreview(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.foldersService.remove(user.id, id);
  }
}
