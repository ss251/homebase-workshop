import { Address } from 'viem';
import { CoinCreationRequest, FarcasterCast } from '../types/index.js';

/**
 * Check if a message is requesting to create a coin
 * @param text The text to check
 * @returns True if the text appears to be a coin creation request
 */
export function isCoinCreationRequest(text: string): boolean {
  // Check for the specific command format
  return text.toLowerCase().includes('coin this') || text.toLowerCase().includes('coin this content');
}

/**
 * Parse coin creation request from the message text
 * @param cast The Farcaster cast containing the request
 * @param imageUrl The image URL to use for the coin
 * @param creatorAddress The Ethereum address of the requester
 * @returns Parsed coin creation request or null if parsing failed
 */
export function parseCoinCreationRequest(
  cast: FarcasterCast, 
  imageUrl: string, 
  creatorAddress: Address
): CoinCreationRequest | null {
  const text = cast.text || '';
  
  // Extract name and ticker from the message
  // Format: "coin this content: name: [name] ticker: [ticker]"
  // or any variation containing those keywords
  const nameMatch = text.match(/name:\s*([^\s,]+)/i);
  const tickerMatch = text.match(/ticker:\s*([^\s,]+)/i);
  
  // Fall back to author username if name not specified
  let name = nameMatch?.[1] || cast.author.username || 'Zoiner';
  
  // Fall back to a generated ticker if not specified
  let symbol = tickerMatch?.[1] || 
    (cast.author.username 
      ? cast.author.username.substring(0, Math.min(5, cast.author.username.length)).toUpperCase() 
      : `ZOI${Date.now().toString().substring(8, 12)}`);
  
  // Make sure they're not too long
  name = name.substring(0, 30);
  symbol = symbol.substring(0, 5).toUpperCase();
  
  if (!imageUrl) {
    return null;
  }
  
  return {
    name,
    symbol,
    imageUrl,
    creatorAddress
  };
} 