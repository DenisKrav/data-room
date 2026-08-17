import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.client = createClient(
      config.getOrThrow<string>('SUPABASE_URL'),
      config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
    );
    this.bucket = config.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, body, { contentType, upsert: false });
    if (error) {
      throw new InternalServerErrorException(`Storage upload failed: ${error.message}`);
    }
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const { error } = await this.client.storage.from(this.bucket).remove(keys);
    if (error) {
      throw new InternalServerErrorException(`Storage remove failed: ${error.message}`);
    }
  }

  async createSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);
    if (error || !data) {
      throw new InternalServerErrorException(
        `Storage signed URL failed: ${error?.message ?? 'unknown error'}`,
      );
    }
    return data.signedUrl;
  }
}
