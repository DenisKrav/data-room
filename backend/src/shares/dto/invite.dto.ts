import { IsEmail, IsEnum, IsUUID, ArrayMaxSize, ArrayMinSize, IsArray } from 'class-validator';
import { ShareResourceType } from '@prisma/client';

export class InviteDto {
  @IsEnum(ShareResourceType)
  resourceType: ShareResourceType;

  @IsUUID()
  resourceId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  emails: string[];
}
