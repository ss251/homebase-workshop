import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { PinataService } from './services/pinata.js';

// Load environment variables first, before anything else
console.log('🔄 Loading environment variables from .env file...');
dotenv.config();

// Check if .env file exists
const envPath = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envPath);
if (!envExists) {
  console.error('❌ .env file not found at:', envPath);
  console.log('Please create a .env file with your Pinata credentials.');
  process.exit(1);
}

// Display environment variables (redacted)
console.log('🔍 Environment variables:');
console.log('PINATA_JWT:', process.env.PINATA_JWT 
  ? `✅ Set ${process.env.PINATA_JWT.length > 0 ? '(length: ' + process.env.PINATA_JWT.length + ')' : '(empty string)'}` 
  : '❌ Not set');
console.log('GATEWAY_URL:', process.env.GATEWAY_URL 
  ? `✅ Set: ${process.env.GATEWAY_URL}` 
  : '⚠️ Not set, will use default gateway');

// Exit if PINATA_JWT is missing
if (!process.env.PINATA_JWT || process.env.PINATA_JWT.trim() === '') {
  console.error('❌ ERROR: PINATA_JWT is missing or empty in your .env file');
  console.log('Please set a valid JWT token from Pinata in your .env file:');
  console.log('PINATA_JWT=your_jwt_token_here');
  process.exit(1);
}

async function main() {
  try {
    console.log('\n🔄 Creating Pinata service...');
    const pinataService = new PinataService();
    
    console.log('🔍 Testing authentication...');
    try {
      const isAuthenticated = await pinataService.testAuthentication();
      console.log('✅ Authentication successful!');
    
      // Test JSON upload
      console.log('\n🔄 Testing JSON upload...');
      const testMetadata = {
        name: 'Test Token',
        description: 'This is a test token',
        image: 'https://example.com/image.jpg',
        properties: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };
      
      const jsonUri = await pinataService.pinJSONToIPFS(testMetadata, 'test-metadata.json');
      console.log('✅ JSON upload successful:', jsonUri);
      console.log('🔗 Gateway URL:', pinataService.getGatewayUrl(jsonUri));
      
      console.log('\n🎉 All tests passed! Pinata integration is working correctly.\n');
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.message);
      throw authError;
    }
  } catch (error: any) {
    console.error('\n❌ Error testing Pinata integration:', error.message);
    
    // Print additional troubleshooting info
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure your .env file has a valid PINATA_JWT');
    console.log('2. Verify your Pinata JWT is not expired');
    console.log('3. Check your network connection');
    console.log('4. If using a custom gateway, ensure GATEWAY_URL is correct');
    
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 