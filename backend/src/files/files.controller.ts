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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { MoveFileDto } from './dto/move-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FilesService } from './files.service';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('folders/:folderId/files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('folderId') folderId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.upload(user.id, folderId, file);
  }

  @Get('files/:id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.filesService.getOne(user.id, id);
  }

  @Get('files/:id/view-url')
  getViewUrl(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.filesService.getViewUrl(user.id, id);
  }

  @Patch('files/:id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.filesService.rename(user.id, id, dto);
  }

  @Post('files/:id/move')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MoveFileDto,
  ) {
    return this.filesService.move(user.id, id, dto);
  }

  @Delete('files/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.filesService.remove(user.id, id);
  }
}
