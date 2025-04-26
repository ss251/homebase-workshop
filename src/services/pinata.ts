import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export class PinataService {
  private jwt: string;
  private gatewayUrl: string;
  private apiUrl: string = 'https://api.pinata.cloud';

  constructor() {
    // Get credentials from environment
    this.jwt = process.env.PINATA_JWT || '';
    this.gatewayUrl = process.env.GATEWAY_URL || 'gateway.pinata.cloud';
    
    // Log clear message if credentials are missing
    if (!this.jwt || this.jwt.trim() === '') {
      console.error('🚨 PINATA_JWT environment variable is not set or is empty');
      console.error('Set this environment variable in your .env file:');
      console.error('PINATA_JWT=your_jwt_token_here');
    }
  }

  /**
   * Test authentication with Pinata
   * @returns Promise resolving to true if authenticated, false otherwise
   */
  async testAuthentication(): Promise<boolean> {
    // Validate JWT before attempting auth
    if (!this.jwt || this.jwt.trim() === '') {
      throw new Error('PINATA_JWT environment variable is not set. Cannot authenticate with Pinata.');
    }
    
    try {
      console.log('Testing Pinata authentication...');
      const response = await axios.get(`${this.apiUrl}/data/testAuthentication`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('✅ Pinata authentication successful');
      return response.status === 200;
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error?.reason || error.message;
      
      console.error(`❌ Pinata authentication failed: ${statusCode} - ${errorMessage}`);
      
      if (statusCode === 401) {
        console.error('🔑 Your JWT token is invalid or expired. Update your PINATA_JWT environment variable.');
      }
      
      throw new Error(`Pinata authentication failed: ${errorMessage}`);
    }
  }

  /**
   * Get common headers for Pinata API requests
   */
  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.jwt}`
    };
  }

  /**
   * Upload JSON data to IPFS
   * @param jsonBody The JSON data to upload
   * @param name Optional name for the file
   * @returns Promise resolving to the IPFS URI
   */
  async pinJSONToIPFS(jsonBody: any, name = 'metadata.json'): Promise<string> {
    // Ensure we're authenticated before trying
    await this.testAuthentication();
    
    try {
      console.log('📤 Uploading JSON to Pinata:', name);
      
      const response = await axios.post(
        `${this.apiUrl}/pinning/pinJSONToIPFS`,
        {
          pinataContent: jsonBody,
          pinataMetadata: {
            name: name
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders()
          }
        }
      );
      
      if (response.status === 200) {
        const ipfsHash = response.data.IpfsHash;
        const ipfsUri = `ipfs://${ipfsHash}`;
        const gatewayUrl = this.getGatewayUrl(ipfsHash);
        
        console.log(`✅ JSON pinned to IPFS with hash: ${ipfsHash}`);
        console.log(`🔗 Gateway URL: ${gatewayUrl}`);
        
        return ipfsUri;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      const errorDetails = error.response?.data?.error || error.message;
      console.error(`❌ Error pinning JSON to IPFS: ${errorDetails}`);
      throw new Error(`Failed to pin JSON to IPFS: ${errorDetails}`);
    }
  }

  /**
   * Upload a file to IPFS
   * @param filePath Path to the file to upload
   * @param name Optional name for the file
   * @returns Promise resolving to the IPFS URI
   */
  async pinFileToIPFS(filePath: string, name?: string): Promise<string> {
    // Ensure we're authenticated before trying
    await this.testAuthentication();
    
    try {
      console.log(`📤 Uploading file to Pinata: ${filePath}`);
      
      const formData = new FormData();
      
      // Add the file to form data
      const file = fs.createReadStream(filePath);
      formData.append('file', file);
      
      // Add metadata if name is provided
      if (name) {
        const metadata = JSON.stringify({
          name: name
        });
        formData.append('pinataMetadata', metadata);
      }
      
      const response = await axios.post(
        `${this.apiUrl}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...this.getAuthHeaders(),
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      if (response.status === 200) {
        const ipfsHash = response.data.IpfsHash;
        const ipfsUri = `ipfs://${ipfsHash}`;
        const gatewayUrl = this.getGatewayUrl(ipfsHash);
        
        console.log(`✅ File pinned to IPFS with hash: ${ipfsHash}`);
        console.log(`🔗 Gateway URL: ${gatewayUrl}`);
        
        return ipfsUri;
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: any) {
      const errorDetails = error.response?.data?.error || error.message;
      console.error(`❌ Error pinning file to IPFS: ${errorDetails}`);
      throw new Error(`Failed to pin file to IPFS: ${errorDetails}`);
    }
  }

  /**
   * Upload a buffer to IPFS
   * @param fileBuffer The file buffer to upload
   * @param filename Filename to use
   * @returns Promise resolving to the IPFS URI
   */
  async pinBufferToIPFS(fileBuffer: Buffer, filename: string): Promise<string> {
    try {
      // Create a temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, filename);
      fs.writeFileSync(tempFilePath, fileBuffer);
      
      // Upload the file
      const result = await this.pinFileToIPFS(tempFilePath, filename);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFilePath);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to clean up temporary file:', cleanupError);
      }
      
      return result;
    } catch (error: any) {
      console.error(`❌ Error pinning buffer to IPFS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get content from IPFS via gateway
   * @param cid The IPFS CID to fetch
   * @returns Promise resolving to the content
   */
  async getFromIPFS(cid: string): Promise<any> {
    try {
      // Remove ipfs:// prefix if present
      const cleanCid = cid.replace('ipfs://', '');
      const gatewayUrl = this.getGatewayUrl(cleanCid);
      
      const response = await axios.get(gatewayUrl);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error fetching from IPFS: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the gateway URL for an IPFS hash
   * @param ipfsHash The IPFS hash (CID)
   * @returns The gateway URL
   */
  getGatewayUrl(ipfsHash: string): string {
    // Remove ipfs:// prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    return `https://${this.gatewayUrl}/ipfs/${hash}`;
  }
} 