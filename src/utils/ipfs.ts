import { ZoraMetadata } from '../types/index.js';
import { PinataService } from '../services/pinata.js';
import axios from 'axios';

// Use a lazy-loaded singleton pattern for PinataService
let pinataServiceInstance: PinataService | null = null;

/**
 * Get the PinataService instance (lazy-loaded singleton)
 * This ensures the service is only created after environment variables are loaded
 */
function getPinataService(): PinataService {
  if (!pinataServiceInstance) {
    pinataServiceInstance = new PinataService();
  }
  return pinataServiceInstance;
}

/**
 * Convert image URL to metadata URI for Zora
 * @param name Coin name
 * @param symbol Coin symbol
 * @param imageUrl Image URL
 * @returns A metadata URI that can be used for Zora
 */
export async function generateZoraMetadata(
  name: string,
  symbol: string,
  imageUrl: string,
  description?: string
): Promise<ZoraMetadata> {
  return {
    name,
    symbol,
    description: description || `${name} - Created with Zoiner on Farcaster`,
    image: imageUrl,
    properties: {
      category: "social"
    }
  };
}

/**
 * Upload metadata to IPFS using PinataService
 * @param metadata The metadata object following Zora's standard
 * @returns The IPFS URI that Zora can access
 */
export async function uploadMetadataToIPFS(metadata: ZoraMetadata): Promise<string> {
  console.log('Preparing metadata for upload:', JSON.stringify(metadata, null, 2));
  
  try {
    console.log('Uploading metadata to Pinata...');
    
    // Use the API endpoint for metadata as a fallback
    const apiEndpoint = process.env.API_ENDPOINT || `http://localhost:${process.env.PORT || 3000}`;
    
    try {
      // Try to use Pinata (lazy-loaded after env vars are set)
      const pinataService = getPinataService();
      const ipfsUri = await pinataService.pinJSONToIPFS(metadata, `${metadata.name}-metadata.json`);
      
      console.log('✅ Successfully uploaded metadata to IPFS:', ipfsUri);
      return ipfsUri;
    } catch (pinataError: any) {
      console.error('❌ Failed to upload to Pinata:', pinataError.message);
      console.log('📌 Using API metadata endpoint as fallback...');
      
      // Create querystring from metadata
      const params = new URLSearchParams({
        name: metadata.name,
        symbol: metadata.symbol || metadata.name,
        image: metadata.image
      });
      
      // Use the API endpoint instead
      const metadataUrl = `${apiEndpoint}/metadata?${params.toString()}`;
      console.log('📄 Metadata accessible at:', metadataUrl);
      
      return metadataUrl;
    }
  } catch (error: any) {
    console.error('❌ All metadata upload methods failed:', error.message);
    throw new Error(`Failed to create metadata URI: ${error.message}`);
  }
}

/**
 * Upload an image from URL to IPFS
 * @param imageUrl URL of the image to upload
 * @param name Optional name for the image
 * @returns Promise resolving to the IPFS URI
 */
export async function uploadImageUrlToIPFS(imageUrl: string, name?: string): Promise<string> {
  try {
    console.log(`Downloading image from ${imageUrl}...`);
    
    // Download the image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    
    // Determine filename
    const defaultName = imageUrl.split('/').pop() || 'image.jpg';
    const filename = name || defaultName;
    
    try {
      // Upload to IPFS (lazy-loaded after env vars are set)
      console.log(`Uploading image to IPFS as ${filename}...`);
      const pinataService = getPinataService();
      return await pinataService.pinBufferToIPFS(buffer, filename);
    } catch (pinataError) {
      console.error('❌ Failed to upload image to IPFS:', pinataError);
      console.log('🔄 Using original image URL instead:', imageUrl);
      
      // Return the original URL as fallback
      return imageUrl;
    }
  } catch (error) {
    console.error('❌ Error processing image URL:', error);
    
    // If we couldn't download or process, return the original URL
    return imageUrl;
  }
} 