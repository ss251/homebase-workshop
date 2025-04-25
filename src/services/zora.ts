import { createCoin } from '@zoralabs/coins-sdk';
import { Address, Hex, WalletClient, PublicClient } from 'viem';
import { CoinCreationParams, CoinCreationResult } from '../types/index.js';

// WORKSHOP ONLY: Hardcoded metadata URL known to work with Zora
const WORKSHOP_METADATA_URL = "https://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy.ipfs.dweb.link";

export class ZoraService {
  private walletClient: WalletClient;
  private publicClient: PublicClient;
  
  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }
  
  /**
   * Create a new Zora coin
   * @param params Parameters for coin creation
   * @returns Result of coin creation or throws on error
   */
  async createCoin(params: CoinCreationParams): Promise<CoinCreationResult> {
    try {
      // WORKSHOP ONLY: For workshop purposes, override the URI with a known working one
      const workshopParams = {
        ...params,
        uri: WORKSHOP_METADATA_URL
      };
      
      console.log('Creating Zora coin with params:', {
        ...workshopParams,
        // Replace actual private data with placeholder for logging
        payoutRecipient: workshopParams.payoutRecipient ? 
          `${(workshopParams.payoutRecipient as string).substring(0, 6)}...` : undefined,
        platformReferrer: workshopParams.platformReferrer ? 
          `${(workshopParams.platformReferrer as string).substring(0, 6)}...` : undefined
      });
      
      // Call Zora SDK to create the coin with workshop params
      const result = await createCoin(
        workshopParams,
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
    } catch (error) {
      console.error('Error creating Zora coin:', error);
      throw error;
    }
  }
  
  /**
   * Build a proper metadata URI from an image URL
   * @param imageUrl URL of the image
   * @returns A valid metadata URI that Zora accepts
   */
  buildMetadataUri(imageUrl: string): string {
    // In a workshop environment, use a hardcoded URL that's known to work
    return WORKSHOP_METADATA_URL;
  }
} 