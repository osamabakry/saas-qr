import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private s3: AWS.S3 | null = null;
  private bucket: string;
  private useLocalStorage: boolean;
  private uploadsDir: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get('AWS_SECRET_ACCESS_KEY');
    
    // Check if AWS credentials are available
    this.useLocalStorage = !accessKeyId || !secretAccessKey;
    
    if (!this.useLocalStorage) {
      try {
        this.s3 = new AWS.S3({
          accessKeyId,
          secretAccessKey,
          region: this.configService.get('AWS_REGION') || 'us-east-1',
        });
        this.bucket = this.configService.get('AWS_S3_BUCKET') || 'qr-menu-images';
        this.logger.log('Using AWS S3 for file storage');
      } catch (error) {
        this.logger.warn('Failed to initialize AWS S3, falling back to local storage');
        this.useLocalStorage = true;
      }
    } else {
      this.logger.log('AWS credentials not found, using local file storage');
    }

    // Setup local storage directory
    if (this.useLocalStorage) {
      this.uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
        this.logger.log(`Created uploads directory: ${this.uploadsDir}`);
      }
    }
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    if (this.useLocalStorage) {
      return this.uploadFileLocal(buffer, key, contentType);
    }

    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      };

      await this.s3!.putObject(params).promise();
      return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error('Failed to upload to S3, falling back to local storage', error);
      return this.uploadFileLocal(buffer, key, contentType);
    }
  }

  private async uploadFileLocal(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    const filePath = path.join(this.uploadsDir, key);
    const dir = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Return local URL (backend server URL)
    const backendUrl = this.configService.get('BACKEND_URL') || 
                      this.configService.get('API_URL') || 
                      'http://localhost:3001';
    return `${backendUrl}/uploads/${key}`;
  }

  async deleteFile(url: string): Promise<void> {
    if (this.useLocalStorage) {
      return this.deleteFileLocal(url);
    }

    try {
      // Extract key from URL
      const key = url.split('.com/')[1];
      if (!key) return;

      await this.s3!
        .deleteObject({
          Bucket: this.bucket,
          Key: key,
        })
        .promise();
    } catch (error) {
      this.logger.error('Failed to delete from S3', error);
      // Try local deletion as fallback
      this.deleteFileLocal(url);
    }
  }

  private async deleteFileLocal(url: string): Promise<void> {
    try {
      // Extract key from URL (remove /uploads/ prefix)
      const key = url.includes('/uploads/') 
        ? url.split('/uploads/')[1] 
        : url.split('/').pop();
      
      if (!key) return;

      const filePath = path.join(this.uploadsDir, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      this.logger.error('Failed to delete local file', error);
    }
  }

  async uploadImage(
    buffer: Buffer,
    folder: string,
    filename: string,
  ): Promise<string> {
    const key = `${folder}/${filename}`;
    return this.uploadFile(buffer, key, 'image/png');
  }
}
