import { IsEnum, IsUUID } from 'class-validator';
import { ShareResourceType } from '@prisma/client';

export class ResourceRefDto {
  @IsEnum(ShareResourceType)
  resourceType: ShareResourceType;

  @IsUUID()
  resourceId: string;
}
