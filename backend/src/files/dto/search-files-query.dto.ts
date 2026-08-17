import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchFilesQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  q: string;
}