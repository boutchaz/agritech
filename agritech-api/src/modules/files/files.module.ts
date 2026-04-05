import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (_req, file, callback) => {
        // Block dangerous executable MIME types
        const blockedMimeTypes = [
          'application/x-executable',
          'application/x-msdownload',
          'application/x-msdos-program',
          'application/x-sh',
          'application/x-csh',
          'text/x-shellscript',
        ];
        if (blockedMimeTypes.includes(file.mimetype)) {
          callback(new Error('File type not allowed'), false);
        } else {
          callback(null, true);
        }
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
