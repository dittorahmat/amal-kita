import type { Env } from '../core-utils';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

export class CloudinaryService {
  private cloudName: string;
  private apiKey: string;
  private apiSecret: string;
  private uploadPreset?: string;

  constructor(env: Env) {
    this.cloudName = env.CLOUDINARY_CLOUD_NAME;
    this.apiKey = env.CLOUDINARY_API_KEY;
    this.apiSecret = env.CLOUDINARY_API_SECRET;
    this.uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;

    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      throw new Error('Cloudinary credentials are not properly configured in environment variables');
    }
  }

  /**
   * Uploads an image to Cloudinary
   * @param imageData - Base64 encoded image data, data URL, or ArrayBuffer
   * @param fileName - Desired filename for the image
   * @param imageType - Type of image (campaign or event) for folder organization
   * @returns Object containing the image URL and metadata
   */
  async uploadImage(
    imageData: string | ArrayBuffer,
    fileName: string,
    imageType: 'campaign' | 'event' = 'campaign'
  ): Promise<CloudinaryUploadResult> {
    // Prepare the image data for upload
    let uploadData: string;

    if (typeof imageData === 'string') {
      // If it's a data URL, use it directly
      if (imageData.startsWith('data:')) {
        uploadData = imageData;
      } else {
        // If it's already base64, format it as a data URL
        const mimeType = this.getMimeTypeFromFileName(fileName);
        uploadData = `data:${mimeType};base64,${imageData}`;
      }
    } else {
      // Convert ArrayBuffer to base64 string and format as data URL
      const uint8Array = new Uint8Array(imageData);
      let binary = '';
      for (let i = 0; i < uint8Array.byteLength; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      const mimeType = this.getMimeTypeFromFileName(fileName);
      uploadData = `data:${mimeType};base64,${base64}`;
    }

    // Determine upload method based on whether we have an upload preset
    let formData: FormData;

    if (this.uploadPreset) {
      // Use unsigned upload with preset (simpler, but requires preset to be configured in Cloudinary)
      formData = new FormData();
      formData.append('file', uploadData);
      formData.append('upload_preset', this.uploadPreset);
      formData.append('public_id', `${imageType}s/${Date.now()}_${Math.random().toString(36).substr(2, 9)}/${this.getPublicIdFromFileName(fileName)}`);
      formData.append('folder', `amal-kita/${imageType}s`);
    } else {
      // Use authenticated upload with signature (more secure, doesn't require preset)
      const timestamp = Date.now();
      const params = {
        folder: `amal-kita/${imageType}s`,
        public_id: `${imageType}s/${Date.now()}_${Math.random().toString(36).substr(2, 9)}/${this.getPublicIdFromFileName(fileName)}`,
        timestamp: timestamp.toString(),
      };

      // Create the signature by sorting parameters and hashing with the API secret
      const signature = await this.generateSignature(params);

      // Create form data for Cloudinary upload
      formData = new FormData();
      formData.append('file', uploadData);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', params.folder);
      formData.append('public_id', params.public_id);
    }

    try {
      // Upload to Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Deletes an image from Cloudinary
   * @param publicId - The public ID of the image to delete
   */
  async deleteImage(publicId: string): Promise<boolean> {
    // Note: For a complete implementation, you would need to generate an authentication signature
    // This requires more complex server-side logic to sign the request properly
    // For now, this is a placeholder implementation
    console.warn('Cloudinary delete functionality requires server-side signature generation for security');
    return false; // Placeholder - implement with proper signature generation in production
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

    // Check size (max 10MB for Cloudinary free tier)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (size > maxSize) {
      errors.push('Ukuran gambar terlalu besar. Maksimal 10MB');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Gets MIME type from file extension
   */
  private getMimeTypeFromFileName(fileName: string): string {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg'; // default fallback
    }
  }

  /**
   * Extracts public ID from file name (removes extension)
   */
  private getPublicIdFromFileName(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, ""); // Remove extension
  }

  /**
   * Generates a signature for Cloudinary API requests
   */
  private async generateSignature(params: Record<string, any>): Promise<string> {
    // Sort the parameters by key
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');

    // Create the signature string by appending the API secret
    const signatureStr = paramStr + this.apiSecret;

    // Create a hash of the signature string using SHA-1
    // In a real implementation, we would use crypto.subtle, but for now we'll use a placeholder
    // For Cloudflare Workers, we can use the crypto.subtle API

    // Create a TextEncoder to convert the string to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureStr);

    // Hash the data using SHA-1
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);

    // Convert the hash to a hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }
}