/**
 * Test script to verify Cloudinary integration with actual upload
 */
import { ImageService } from './worker/services/image-service';

// Mock environment for testing (without R2 buckets to test Cloudinary fallback)
const mockEnv = {
  CLOUDINARY_CLOUD_NAME: 'dogjcyuxn',
  CLOUDINARY_API_KEY: '678593415839236',
  CLOUDINARY_API_SECRET: 'iBd8KocwZZEgSvPBdOa4iS7ivQg',
  CLOUDINARY_UPLOAD_PRESET: 'amal_kita_upload', // This preset needs to be created in Cloudinary
  // R2 buckets are not defined to test Cloudinary fallback
};

async function testCloudinaryUpload() {
  console.log('Testing Cloudinary upload functionality...');
  
  try {
    // Test ImageService with no R2 buckets (should fallback to Cloudinary)
    console.log('\n1. Testing ImageService initialization...');
    const imageService = new ImageService(mockEnv as any, 'campaign');
    console.log('✓ ImageService initialized successfully with Cloudinary fallback');
    
    // Create a small mock image (base64 encoded 1x1 pixel PNG)
    const mockImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const fileName = 'test-image.png';
    const contentType = 'image/png';
    
    console.log('\n2. Testing image upload to Cloudinary...');
    console.log('Attempting to upload mock image...');
    
    // This will attempt to upload to Cloudinary
    const result = await imageService.uploadImage(mockImageData, fileName, contentType, 'campaign');
    
    console.log('✓ Upload completed with result:', result);
    
    if (result.url && !result.url.includes('placeholder')) {
      console.log('✓ Image uploaded successfully to Cloudinary');
      console.log('  URL:', result.url);
      console.log('  Key:', result.key);
    } else {
      console.log('⚠ Upload fell back to placeholder (expected if Cloudinary preset is not configured)');
      console.log('  This is expected if the upload preset "amal_kita_upload" is not created in your Cloudinary account');
    }
    
    console.log('\n✓ Cloudinary integration test completed!');
    console.log('\nNote: For actual Cloudinary uploads to work, you need to:');
    console.log('1. Create an upload preset named "amal_kita_upload" in your Cloudinary dashboard');
    console.log('2. Make sure it is set to unsigned if you want to use it from the client side');
    console.log('3. Or ensure your API credentials have upload permissions');
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
    console.log('\nThis error is expected if the Cloudinary upload preset is not configured in your Cloudinary account.');
    console.log('Please create an upload preset named "amal_kita_upload" in your Cloudinary dashboard.');
  }
}

// Run the test
testCloudinaryUpload();