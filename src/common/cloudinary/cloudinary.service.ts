import { Injectable, Inject } from '@nestjs/common';
import { Readable } from 'stream';
import { UploadApiResponse, v2 as cloudinaryType } from 'cloudinary';
import { CloudinaryFolder } from '../dto/cloudinary-folder.dto';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY')
    private readonly cloudinaryClient: typeof cloudinaryType,
  ) {}

  async uploadImage(
    buffer: Buffer,
    filename: string,
    folder: CloudinaryFolder,
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinaryClient.uploader.upload_stream(
        {
          folder: folder,
          public_id: filename,
        },
        (err, result) => {
          if (err) {
            return reject(new Error(err.message));
          }
          if (!result) {
            return reject(new Error('Upload failed with no result'));
          }
          return resolve(result);
        },
      );

      const stream = Readable.from(buffer);
      stream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await this.cloudinaryClient.uploader.destroy(publicId);
  }
}
