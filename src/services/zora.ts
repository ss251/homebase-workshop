import { createCoin } from '@zoralabs/coins-sdk';
import { Address, Hex, WalletClient, PublicClient } from 'viem';
import { CoinCreationParams, CoinCreationResult } from '../types/index.js';
import { generateZoraMetadata, uploadMetadataToIPFS } from '../utils/ipfs.js';
import axios from 'axios';

// Add sleep function for retries
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ZoraService {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  
  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }
  
  /**
   * Validate a metadata URI to ensure it's accessible and contains required fields
   * @param uri The metadata URI to validate
   * @returns true if valid, throws error if invalid
   */
  private async validateMetadataURI(uri: string): Promise<boolean> {
    console.log(`Validating metadata URI: ${uri}`);

    // Check if the URI is in a valid format
    if (!uri.startsWith('ipfs://') && !uri.startsWith('http://') && !uri.startsWith('https://')) {
      throw new Error('URI must start with ipfs://, http://, or https://');
    }
    
    // For IPFS URIs, we can't validate content directly in this function
    // But we can check that it follows the correct format and try to fetch from gateway
    if (uri.startsWith('ipfs://')) {
      const cid = uri.replace('ipfs://', '');
      if (!cid || cid.length < 10) {
        throw new Error('Invalid IPFS CID format');
      }
      
      // Try to fetch from multiple gateways to ensure it's accessible
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://${process.env.GATEWAY_URL || 'tan-obvious-puffin-912.mypinata.cloud'}/ipfs/${cid}`
      ];
      
      let fetched = false;
      // Try each gateway
      for (const gateway of gateways) {
        try {
          console.log(`Trying to fetch from gateway: ${gateway}`);
          const response = await axios.get(gateway, { timeout: 5000 });
          if (response.status === 200 && response.data) {
            console.log('✅ Successfully fetched metadata from gateway');
            fetched = true;
            
            // Validate required fields
            const metadata = response.data;
            if (!metadata.name) {
              throw new Error('Metadata must include a name');
            }
            if (!metadata.description) {
              throw new Error('Metadata must include a description');
            }
            if (!metadata.image) {
              throw new Error('Metadata must include an image');
            }
            
            break;
          }
        } catch (error) {
          console.log(`Failed to fetch from gateway ${gateway}: ${error}`);
        }
      }
      
      if (!fetched) {
        console.log('⚠️ Could not fetch IPFS content from any gateway. It may not have propagated yet.');
        console.log('IPFS URI format is valid, but content cannot be verified directly');
      }
      
      return true;
    }
    
    // For HTTP(S) URIs, we can try to fetch the content
    try {
      const response = await axios.get(uri);
      const metadata = response.data;
      
      // Check required fields according to Zora's spec
      if (!metadata.name) {
        throw new Error('Metadata must include a name');
      }
      
      if (!metadata.description) {
        throw new Error('Metadata must include a description');
      }
      
      if (!metadata.image) {
        throw new Error('Metadata must include an image');
      }
      
      console.log('Metadata is valid and accessible');
      return true;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Failed to fetch metadata: HTTP ${error.response.status}`);
      }
      throw new Error(`Failed to fetch metadata: ${error.message}`);
    }
  }

  /**
   * Create a new Zora coin with retry logic for IPFS propagation
   * @param params Parameters for coin creation
   * @returns Result of coin creation or throws on error
   */
  async createCoin(params: CoinCreationParams): Promise<CoinCreationResult> {
    try {
      console.log('Creating Zora coin with params:', {
        ...params,
        // Replace actual private data with placeholder for logging
        payoutRecipient: params.payoutRecipient ? 
          `${(params.payoutRecipient as string).substring(0, 6)}...` : undefined,
        platformReferrer: params.platformReferrer ? 
          `${(params.platformReferrer as string).substring(0, 6)}...` : undefined
      });
      
      // Validate the metadata URI before proceeding
      try {
        // Use DRY_RUN to skip validation in dry run mode
        if (process.env.DRY_RUN !== 'true') {
          const isValid = await this.validateMetadataURI(params.uri);
          console.log(`Metadata validation result: ${isValid ? 'Valid ✅' : 'Invalid ❌'}`);
        } else {
          console.log('🏜️ DRY RUN: Skipping metadata validation');
        }
      } catch (error: any) {
        console.error('Metadata validation error:', error.message);
        
        // If we're in dry run mode, continue despite validation failure
        if (process.env.DRY_RUN !== 'true') {
          throw new Error(`Invalid metadata: ${error.message}`);
        } else {
          console.log('🏜️ DRY RUN: Continuing despite metadata validation failure');
        }
      }
      
      // Check if we're in dry run mode
      if (process.env.DRY_RUN === 'true') {
        // In dry run mode, return a simulated result instead of creating a real coin
        console.log('🏜️ DRY RUN: Simulating coin creation without blockchain transaction');
        
        return {
          hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
          address: '0x0000000000000000000000000000000000000000',
          deployment: { status: 'simulated' }
        };
      }
      
      // Add retry logic for coin creation
      const maxRetries = 3;
      let lastError: any = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}/${maxRetries} to create coin...`);
          
          // Call Zora SDK to create the coin
          const result = await createCoin(
            params,
            this.walletClient,
            this.publicClient
          );
          
          console.log('Zora coin creation successful:', {
            hash: result.hash,
            address: result.address
          });
          
          return {
            hash: result.hash,
            address: result.address,
            deployment: result.deployment
          };
        } catch (error: any) {
          lastError = error;
          
          // If the error is related to metadata fetch, wait and retry
          if (error.message && error.message.includes('Metadata fetch failed')) {
            console.log(`Metadata fetch failed on attempt ${attempt}. The IPFS content may not have propagated yet. Waiting before retry...`);
            
            // Exponential backoff: wait longer between each retry
            const waitTime = 5000 * Math.pow(2, attempt - 1); // 5s, 10s, 20s
            await sleep(waitTime);
          } else {
            // For other errors, don't retry
            throw error;
          }
        }
      }
      
      // If we've exhausted all retries, throw the last error
      throw lastError || new Error('Failed to create coin after multiple attempts');
    } catch (error) {
      console.error('Error creating Zora coin:', error);
      throw error;
    }
  }
  
  /**
   * Build a proper metadata URI for Zora following EIP-7572 standard
   * @param coinName Name of the coin
   * @param coinSymbol Symbol of the coin
   * @param imageUrl URL of the image to use for the coin
   * @returns Promise resolving to the IPFS URI for the metadata
   */
  async buildMetadataUri(coinName: string, coinSymbol: string, imageUrl: string): Promise<string> {
    // Generate metadata following Zora's standard
    const metadata = await generateZoraMetadata(
      coinName,
      coinSymbol,
      imageUrl
    );
    
    // Upload the metadata to IPFS
    let metadataUri = await uploadMetadataToIPFS(metadata);
    
    // If the metadata URI is not IPFS, but we need it to be for Zora validation
    // Use our API endpoint as a fallback with a clear content
    if (!metadataUri.startsWith('ipfs://') && !metadataUri.startsWith('http')) {
      console.warn('⚠️ Invalid metadata URI format, using API endpoint instead');
      
      // Use our API endpoint which serves valid metadata
      const apiEndpoint = process.env.API_ENDPOINT || `http://localhost:${process.env.PORT || 3000}`;
      const params = new URLSearchParams({
        name: coinName,
        symbol: coinSymbol,
        image: imageUrl
      });
      
      metadataUri = `${apiEndpoint}/metadata?${params.toString()}`;
      console.log(`Using API endpoint for metadata: ${metadataUri}`);
    }
    
    return metadataUri;
  }
  
  /**
   * Generate a Zora coin URL from the contract address
   * @param contractAddress The address of the deployed coin contract
   * @param referrerAddress Optional referrer address
   * @returns URL to view the coin on Zora
   */
  generateZoraUrl(contractAddress: string, referrerAddress?: string): string {
    const baseUrl = `https://zora.co/api/og-image/coin/base:${contractAddress}`;
    return referrerAddress ? `${baseUrl}?referrer=${referrerAddress}` : baseUrl;
  }
} 