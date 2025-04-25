import { extractImageFromCast } from '../utils/image.js';
import { isCoinCreationRequest, parseCoinCreationRequest } from '../utils/parser.js';
export class BotService {
    constructor(neynarService, zoraService) {
        this.neynarService = neynarService;
        this.zoraService = zoraService;
    }
    /**
     * Process an incoming webhook event for a cast
     * @param castHash The hash of the cast to process
     */
    async processCast(castHash) {
        try {
            // Fetch full cast details
            const cast = await this.neynarService.getCastByHash(castHash);
            if (!cast) {
                console.warn(`Failed to fetch cast with hash ${castHash}`);
                return;
            }
            // Check if this is a cast that mentions our bot
            if (!this.neynarService.castMentionsBot(cast)) {
                console.log(`Cast ${castHash} does not mention our bot, ignoring`);
                return;
            }
            // Check if this is a coin creation request
            if (!isCoinCreationRequest(cast.text)) {
                await this.replyWithUsageInstructions(cast);
                return;
            }
            // Process the coin creation request
            await this.processCoinCreationRequest(cast);
        }
        catch (error) {
            console.error(`Error processing cast ${castHash}:`, error);
        }
    }
    /**
     * Process a coin creation request from a cast
     * @param cast The cast containing the coin creation request
     */
    async processCoinCreationRequest(cast) {
        try {
            // Extract the image from the cast (will always return a valid URL now)
            const imageUrl = await extractImageFromCast(cast);
            console.log(`Using image URL for coin creation: ${imageUrl}`);
            // Get the creator's Ethereum address
            const creatorAddress = await this.neynarService.getUserEthereumAddress(cast.author.fid);
            if (!creatorAddress) {
                await this.neynarService.replyToCast(cast.author.fid, cast.hash, "I couldn't find your Ethereum address. Please verify an Ethereum address on your Farcaster profile before creating a coin.");
                return;
            }
            // Parse the coin creation request
            const coinRequest = parseCoinCreationRequest(cast, imageUrl, creatorAddress);
            if (!coinRequest) {
                await this.neynarService.replyToCast(cast.author.fid, cast.hash, "I couldn't parse your coin creation request. Please use the format: coin this content: name: [name] ticker: [ticker]");
                return;
            }
            // Send a reply indicating we're working on it
            await this.neynarService.replyToCast(cast.author.fid, cast.hash, `Working on creating your ${coinRequest.name} (${coinRequest.symbol}) coin... This might take a minute.`);
            // Create the coin using Zora
            const result = await this.zoraService.createCoin({
                name: coinRequest.name,
                symbol: coinRequest.symbol,
                uri: this.zoraService.buildMetadataUri(coinRequest.imageUrl),
                payoutRecipient: coinRequest.creatorAddress,
                initialPurchaseWei: 0n
            });
            // Send a reply with the result
            await this.neynarService.replyToCast(cast.author.fid, cast.hash, `🎉 Successfully created ${coinRequest.name} (${coinRequest.symbol}) coin!\n\nContract: ${result.address}\nTransaction: https://basescan.org/tx/${result.hash}\n\nYour coin is now live on Base!`);
        }
        catch (error) {
            console.error('Error processing coin creation request:', error);
            // Send a reply with the error
            await this.neynarService.replyToCast(cast.author.fid, cast.hash, `Sorry, there was an error creating your coin: ${error.message}. Please try again later.`);
        }
    }
    /**
     * Reply with usage instructions when bot is mentioned without proper command
     * @param cast The cast to reply to
     */
    async replyWithUsageInstructions(cast) {
        await this.neynarService.replyToCast(cast.author.fid, cast.hash, "👋 Hi there! I'm Zoiner, a bot that creates Zora ERC20 coins from images.\n\n" +
            "To create a coin, tag me with an image and include the text: \"coin this content: name: YourCoinName ticker: YCN\"\n\n" +
            "Make sure your profile has a verified Ethereum address, as you'll be set as the payout recipient.");
    }
}
