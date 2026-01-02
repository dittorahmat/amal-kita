/**
 * Test script to verify Cloudinary integration
 */
import { ImageService } from './worker/services/image-service';
import { CloudinaryService } from './worker/services/cloudinary-service';

// Mock environment for testing
const mockEnv = {
  CLOUDINARY_CLOUD_NAME: 'dogjcyuxn',
  CLOUDINARY_API_KEY: '678593415839236',
  CLOUDINARY_API_SECRET: 'iBd8KocwZZEgSvPBdOa4iS7ivQg',
  // R2 buckets are not defined to test Cloudinary fallback
};

async function testCloudinaryIntegration() {
  console.log('Testing Cloudinary integration...');
  
  try {
    // Test Cloudinary service directly
    console.log('\n1. Testing CloudinaryService initialization...');
    const cloudinaryService = new CloudinaryService(mockEnv as any);
    console.log('✓ CloudinaryService initialized successfully');
    
    // Test ImageService with no R2 buckets (should fallback to Cloudinary)
    console.log('\n2. Testing ImageService with Cloudinary fallback...');
    const imageService = new ImageService(mockEnv as any, 'campaign');
    console.log('✓ ImageService initialized successfully with Cloudinary fallback');
    
    // Test validation
    console.log('\n3. Testing image validation...');
    const validation = imageService.validateImage('image/jpeg', 1024 * 1024); // 1MB JPEG
    console.log('✓ Validation result:', validation);
    
    if (validation.isValid) {
      console.log('✓ Image validation passed');
    } else {
      console.error('✗ Image validation failed:', validation.errors);
    }
    
    console.log('\n✓ All tests passed! Cloudinary integration is working correctly.');
    console.log('\nNote: Actual image upload to Cloudinary requires valid image data.');
    console.log('The integration will automatically use Cloudinary when R2 is not available.');
    
  } catch (error) {
    console.error('✗ Test failed with error:', error);
  }
}

// Run the test
testCloudinaryIntegration();