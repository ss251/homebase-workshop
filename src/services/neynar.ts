import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { FarcasterCast, FarcasterUser } from '../types/index.js';

export class NeynarService {
  private client: NeynarAPIClient;
  private signerUuid: string;
  private botFid: number;
  
  constructor(apiKey: string, signerUuid: string, botFid: number) {
    this.client = new NeynarAPIClient({ apiKey });
    this.signerUuid = signerUuid;
    this.botFid = botFid;
  }
  
  /**
   * Get user details by FID
   * @param fid The Farcaster ID to look up
   * @returns User details or null if not found
   */
  async getUserByFid(fid: number): Promise<FarcasterUser | null> {
    try {
      // Using fetchBulkUsers with a single FID
      const response = await this.client.fetchBulkUsers({ fids: [fid] });
      
      if (!response || !response.users || response.users.length === 0) {
        return null;
      }
      
      const user = response.users[0];
      
      // Map from the response format to our internal format
      return {
        fid: user.fid,
        username: user.username ?? 'unnamed',  // Provide defaults for required string fields
        display_name: user.display_name ?? user.username ?? 'Unnamed User', // Use username as fallback
        pfp_url: user.pfp_url,
        verifications: {
          ethereum: user.verifications?.[0] || undefined,
          solana: undefined // Solana not directly provided
        }
      };
    } catch (error) {
      console.error('Error getting user details:', error);
      return null;
    }
  }
  
  /**
   * Get the full details of a cast by its hash
   * @param hash The hash of the cast to fetch
   * @returns A FarcasterCast object or null if not found
   */
  async getCastByHash(hash: string): Promise<FarcasterCast | null> {
    try {
      console.log(`DEBUG - Fetching cast by hash: ${hash}`);
      
      const response = await this.client.fetchBulkCasts({ casts: [hash] });
      
      if (!response?.result?.casts?.[0]) {
        console.warn(`Failed to fetch cast with hash ${hash}`);
        return null;
      }
      
      const rawCast = response.result.casts[0];
      
      // Only log minimal cast details to avoid excessive logging
      console.log('DEBUG - Received cast:', {
        hash: rawCast.hash,
        author_fid: rawCast.author.fid,
        text_length: rawCast.text.length,
        has_embeds: Boolean(rawCast.embeds?.length),
        embeds_count: rawCast.embeds?.length || 0
      });
      
      // Log image-related fields to help with debugging image extraction
      if (rawCast.embeds?.length) {
        console.log('CAST IMAGE RELATED FIELDS:', {
          embedsData: rawCast.embeds
        });
      }
      
      // Format the cast to our internal format
      const formattedCast = this.formatCast(rawCast);
      console.log('DEBUG - Formatted cast:', {
        hash: formattedCast.hash,
        text: formattedCast.text,
        has_embedded_media: Boolean(formattedCast.embedded_media?.length),
        embedded_media_count: formattedCast.embedded_media?.length || 0,
        has_embeds: Boolean(formattedCast.embeds?.length),
        embeds_count: formattedCast.embeds?.length || 0,
        author_fid: formattedCast.author.fid
      });
      
      return formattedCast;
    } catch (error) {
      console.error(`Error fetching cast ${hash}:`, error);
      return null;
    }
  }
  
  /**
   * Reply to a cast with text
   * @param parentFid Author FID of the parent cast
   * @param parentHash Hash of the parent cast
   * @param text Text content for the reply
   * @returns Hash of the new cast or null if failed
   */
  async replyToCast(parentFid: number, parentHash: string, text: string): Promise<string | null> {
    try {
      // Extract URLs from the text to use in embeds
      const urlMatch = text.match(/(https?:\/\/[^\s]+)/g);
      const urls = urlMatch ? [...new Set(urlMatch)] : []; // Remove duplicates
      
      console.log(`Found URLs to embed: ${urls.join(', ')}`);
      
      // Create embeds array if URLs are found
      const embeds = urls.map(url => ({ url }));
      
      // Using publishCast with URLs as embeds
      const response = await this.client.publishCast({
        text: text,
        parent: parentHash,
        parentAuthorFid: parentFid,
        signerUuid: this.signerUuid,
        embeds: embeds.length > 0 ? embeds : undefined
      });
      
      // Use cast hash from the response if available
      return response.cast?.hash || null;
    } catch (error) {
      console.error('Error replying to cast:', error);
      return null;
    }
  }
  
  /**
   * Check if a cast mentions our bot
   * @param cast The cast to check
   * @returns True if the cast mentions our bot
   */
  castMentionsBot(cast: FarcasterCast): boolean {
    console.log('DEBUG - Checking if cast mentions bot');
    console.log('BOT_FID:', this.botFid);
    console.log('Cast mentions array:', JSON.stringify(cast.mentions || []));
    
    if (cast.mentions && cast.mentions.includes(this.botFid)) {
      console.log('DEBUG - Found bot in mentions array ✅');
      return true;
    }
    
    // Also check text for @botname mentions
    const botName = process.env.BOT_NAME || 'zoiner';
    console.log('BOT_NAME from env:', botName);
    console.log('Cast text:', cast.text);
    
    // Check for username format: @zoiner
    const usernameFormat = `@${botName.toLowerCase()}`;
    console.log('Looking for username format:', usernameFormat);
    
    // Check for FID format: @!1057647 (bot's FID)
    const fidFormat = `@!${this.botFid}`;
    console.log('Looking for FID format:', fidFormat);
    
    if (cast.text) {
      const lowerText = cast.text.toLowerCase();
      
      if (lowerText.includes(usernameFormat)) {
        console.log('DEBUG - Found bot username in text ✅');
        return true;
      }
      
      if (lowerText.includes(fidFormat)) {
        console.log('DEBUG - Found bot FID in text ✅');
        return true;
      }
    }
    
    console.log('DEBUG - Bot not mentioned in this cast ❌');
    return false;
  }
  
  /**
   * Get Ethereum address for a Farcaster user
   * @param fid The Farcaster ID to look up
   * @returns Ethereum address or null if not found
   */
  async getUserEthereumAddress(fid: number): Promise<string | null> {
    const user = await this.getUserByFid(fid);
    return user?.verifications?.ethereum || null;
  }
  
  /**
   * Format a cast from Neynar API format to our internal format
   * @param apiCast The cast from Neynar API
   * @returns Formatted cast for internal use
   */
  private formatCast(apiCast: any): FarcasterCast {
    // Log the entire raw cast structure to see all available fields
    console.log('COMPLETE RAW CAST DATA:', JSON.stringify(apiCast, null, 2));
    
    // Log specific fields we're looking for regarding images
    console.log('CAST IMAGE RELATED FIELDS:', JSON.stringify({
      embedsData: apiCast.embeds,
      embedsMedia: apiCast.embedsMedia,
      attachments: apiCast.attachments,
      images: apiCast.images,
      media: apiCast.media,
      frames: apiCast.frames
    }, null, 2));
    
    return {
      hash: apiCast.hash,
      thread_hash: apiCast.threadHash,
      parent_hash: apiCast.parentHash,
      author: {
        fid: apiCast.author.fid,
        username: apiCast.author.username,
        display_name: apiCast.author.displayName,
        pfp_url: apiCast.author.pfp?.url,
        profile: apiCast.author.profile,
        verifications: apiCast.author.verifications
      },
      text: apiCast.text,
      timestamp: apiCast.timestamp,
      embeds: apiCast.embeds?.map((embed: any) => ({
        url: embed.url,
        title: embed.title,
        description: embed.description,
        image: embed.image,
        mimetype: embed.mimetype
      })),
      mentions: apiCast.mentions,
      mentions_positions: apiCast.mentionsPositions,
      parent_url: apiCast.parentUrl,
      embedded_media: apiCast.embedsMedia?.map((media: any) => ({
        url: media.url,
        type: media.type,
        alt_text: media.altText
      }))
    };
  }
} 