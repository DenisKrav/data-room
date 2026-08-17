import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
