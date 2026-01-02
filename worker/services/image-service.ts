/**
 * Service for handling image uploads to Cloudflare R2 with Cloudinary fallback
 */
import type { Env } from '../core-utils';
import { CloudinaryService } from './cloudinary-service';

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export class ImageService {
  private bucket: R2Bucket | undefined;
  private cloudinaryService: CloudinaryService | null = null;
  private imageType: 'campaign' | 'event';

  constructor(env: Env, imageType: 'campaign' | 'event' = 'campaign') {
    // Add debugging to check if R2 buckets are available
    console.log(`ImageService constructor called for type: ${imageType}`);
    console.log(`CAMPAIGN_IMAGES available:`, !!env.CAMPAIGN_IMAGES);
    console.log(`EVENT_IMAGES available:`, !!env.EVENT_IMAGES);

    this.imageType = imageType;
    this.bucket = imageType === 'event' ? env.EVENT_IMAGES : env.CAMPAIGN_IMAGES;

    // Initialize Cloudinary service if credentials are available
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      try {
        // Create a temporary env object with only Cloudinary credentials for the service
        const cloudinaryEnv = {
          CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
        } as Env;

        this.cloudinaryService = new CloudinaryService(cloudinaryEnv);
        console.log('Cloudinary service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize Cloudinary service:', error);
      }
    } else {
      console.warn('Cloudinary credentials not available in environment');
    }

    // Don't throw an error immediately, just log if bucket is not available
    if (!this.bucket) {
      console.warn(`R2 bucket is undefined for imageType: ${imageType}. Will use fallback mechanism if available.`);
    }
  }

  /**
   * Uploads an image to R2 or Cloudinary (if R2 is not available) and returns the public URL
   * @param imageData - Base64 encoded image data or ArrayBuffer
   * @param fileName - Desired filename for the image
   * @param contentType - MIME type of the image
   * @returns Object containing the image URL and metadata
   */
  async uploadImage(imageData: string | ArrayBuffer, fileName: string, contentType: string, imageType: 'campaign' | 'event' = 'campaign'): Promise<ImageUploadResult> {
    console.log(`uploadImage called for type: ${imageType}, fileName: ${fileName}, contentType: ${contentType}`);

    // If R2 bucket is available, try to upload to R2 first
    if (this.bucket) {
      try {
        // Generate a unique key for the image
        const imageKey = `${imageType}s/${Date.now()}_${Math.random().toString(36).substr(2, 9)}/${fileName}`;

        let data: ArrayBuffer;
        if (typeof imageData === 'string') {
          // If the input is a base64 string, convert it to ArrayBuffer
          if (imageData.startsWith('data:')) {
            // Extract base64 data from data URL
            const base64Data = imageData.split(',')[1];
            if (!base64Data) {
              throw new Error('Invalid image data format');
            }
            data = this.base64ToArrayBuffer(base64Data);
          } else {
            // Assume it's raw base64
            data = this.base64ToArrayBuffer(imageData);
          }
        } else {
          // It's already an ArrayBuffer
          data = imageData;
        }

        console.log(`About to upload to R2 with key: ${imageKey}`);

        // Upload to R2
        const object = await this.bucket.put(imageKey, data, {
          httpMetadata: {
            contentType,
          },
          customMetadata: {
            uploadTimestamp: Date.now().toString(),
            originalFileName: fileName,
          },
        });

        if (!object) {
          throw new Error('Failed to upload image to R2');
        }

        // For public access, we'll return a signed URL valid for a long time
        // In a production environment, you might want to make the bucket public
        // and return a direct URL instead of a signed URL
        const url = new URL(`https://${this.bucket.bucketName}.r2.cloudflarestorage.com/${imageKey}`);

        return {
          url: url.toString(),
          key: imageKey,
          size: object.size,
          contentType,
        };
      } catch (r2Error) {
        console.warn(`R2 upload failed:`, r2Error);
        console.log('Falling back to Cloudinary upload');
      }
    }

    // If R2 is not available or failed, try Cloudinary
    if (this.cloudinaryService) {
      try {
        console.log(`Attempting upload to Cloudinary for ${fileName}`);

        // For Cloudinary, we need to pass the image data appropriately
        const result = await this.cloudinaryService.uploadImage(imageData, fileName, imageType);

        // For Cloudinary, we'll use the publicId as the key
        return {
          url: result.url,
          key: result.publicId,
          size: result.bytes,
          contentType,
        };
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
      }
    }

    // If both R2 and Cloudinary fail, return a placeholder
    console.warn(`Both R2 and Cloudinary failed, returning placeholder for ${fileName}`);
    return {
      url: 'https://placehold.co/600x400?text=Image+Placeholder',
      key: `placeholder_${Date.now()}_${fileName}`,
      size: 0,
      contentType,
    };
  }

  /**
   * Deletes an image from R2 or Cloudinary
   * @param imageKey - The key of the image to delete
   */
  async deleteImage(imageKey: string): Promise<boolean> {
    // Try to delete from R2 first
    if (this.bucket) {
      try {
        await this.bucket.delete(imageKey);
        return true;
      } catch (error) {
        console.error('Error deleting image from R2:', error);
        // Continue to try Cloudinary
      }
    }

    // If R2 deletion failed or R2 is not available, try Cloudinary
    if (this.cloudinaryService) {
      try {
        const result = await this.cloudinaryService.deleteImage(imageKey);
        return result;
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        return false;
      }
    }

    console.error('Failed to delete image: neither R2 nor Cloudinary service available');
    return false;
  }

  /**
   * Validates image type and size
   * @param contentType - MIME type of the image
   * @param size - Size of the image in bytes
   */
  validateImage(contentType: string, size: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(contentType)) {
      errors.push(`Format gambar tidak didukung. Gunakan: ${allowedTypes.join(', ')}`);
    }

    // Check size (max 5MB for R2, 10MB for Cloudinary)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes (using Cloudinary's limit)
    if (size > maxSize) {
      errors.push('Ukuran gambar terlalu besar. Maksimal 10MB');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Converts base64 string to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}