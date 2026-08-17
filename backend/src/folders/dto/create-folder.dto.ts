import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsUUID()
  parentId: string;
}
