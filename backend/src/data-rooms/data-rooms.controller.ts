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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { DataRoomsService } from './data-rooms.service';
import { CreateDataRoomDto } from './dto/create-data-room.dto';
import { UpdateDataRoomDto } from './dto/update-data-room.dto';

@Controller('data-rooms')
export class DataRoomsController {
  constructor(private readonly dataRoomsService: DataRoomsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDataRoomDto) {
    return this.dataRoomsService.create(user.id, dto);
  }

  @Get()
  listOwned(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRoomsService.listOwned(user.id);
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dataRoomsService.getOne(user.id, id);
  }

  @Patch(':id')
  rename(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDataRoomDto,
  ) {
    return this.dataRoomsService.rename(user.id, id, dto);
  }

  @Get(':id/delete-preview')
  getDeletePreview(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dataRoomsService.getDeletePreview(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dataRoomsService.remove(user.id, id);
  }
}
