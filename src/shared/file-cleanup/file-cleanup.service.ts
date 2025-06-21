import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileCleanupService {
  private readonly uploadDirs = [
    path.join(process.cwd(), 'uploads', 'avatars'),
    path.join(process.cwd(), 'uploads', 'background-images'),
  ];

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron() {
    for (const dir of this.uploadDirs) {
      if (!fs.existsSync(dir)) continue;

      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith('.uploaded')) {
          const flagPath = path.join(dir, file);
          const imagePath = flagPath.replace('.uploaded', '');
          const stat = fs.statSync(flagPath);
          const age = Date.now() - stat.mtimeMs;

          if (age > 5 * 60 * 1000) {
            try {
              fs.unlinkSync(imagePath); // xóa file ảnh
              fs.unlinkSync(flagPath); // xóa file .uploaded
              console.log(`Deleted: ${imagePath}`);
            } catch (e) {
              console.warn(`Delete failed: ${(e as Error).message}`);
            }
          }
        }
      }
    }
  }
}
