/**
 * Service for handling image uploads to Cloudflare R2
 */
import type { Env } from '../core-utils';

export interface ImageUploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export class ImageService {
  private bucket: R2Bucket;

  constructor(env: Env, imageType: 'campaign' | 'event' = 'campaign') {
    this.bucket = imageType === 'event' ? env.EVENT_IMAGES : env.CAMPAIGN_IMAGES;
  }

  /**
   * Uploads an image to R2 and returns the public URL
   * @param imageData - Base64 encoded image data or ArrayBuffer
   * @param fileName - Desired filename for the image
   * @param contentType - MIME type of the image
   * @returns Object containing the image URL and metadata
   */
  async uploadImage(imageData: string | ArrayBuffer, fileName: string, contentType: string, imageType: 'campaign' | 'event' = 'campaign'): Promise<ImageUploadResult> {
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
  }

  /**
   * Deletes an image from R2
   * @param imageKey - The key of the image to delete
   */
  async deleteImage(imageKey: string): Promise<boolean> {
    try {
      await this.bucket.delete(imageKey);
      return true;
    } catch (error) {
      console.error('Error deleting image from R2:', error);
      return false;
    }
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
    
    // Check size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (size > maxSize) {
      errors.push('Ukuran gambar terlalu besar. Maksimal 5MB');
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