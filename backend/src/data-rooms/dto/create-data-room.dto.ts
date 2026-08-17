import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDataRoomDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;
}
