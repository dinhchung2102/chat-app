import { Injectable, Inject } from '@nestjs/common';
import { v2 as CloudinaryType, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinary: typeof CloudinaryType,
  ) {}

  /**
   * Upload an image buffer to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = 'default',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error: Error | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(
              error instanceof Error ? error : new Error(String(error)),
            );
          }
          if (!result) {
            return reject(new Error('Upload failed'));
          }
          resolve(result);
        },
      );

      const readable = new Readable();
      readable.push(file.buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
  /**
   * Delete image by public_id
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }

  /**
   * Generate Cloudinary URL (transformation optional)
   */
  getPublicUrl(publicId: string, options: object = {}): string {
    return this.cloudinary.url(publicId, options);
  }
}
