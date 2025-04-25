import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { NeynarService } from './services/neynar.js';
import { ZoraService } from './services/zora.js';
import { BotService } from './services/bot.js';
// Load environment variables
console.log('Loading environment variables from .env file...');
dotenv.config();
// Debug environment variables
console.log('DEBUG - Environment Variables:');
console.log('NEYNAR_API_KEY:', process.env.NEYNAR_API_KEY ? '[REDACTED]' : 'NOT SET');
console.log('SIGNER_UUID:', process.env.SIGNER_UUID ? '[PRESENT]' : 'NOT SET');
console.log('BOT_FID:', process.env.BOT_FID);
console.log('BOT_NAME:', process.env.BOT_NAME);
// Set up wallet for Zora interactions
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
if (!walletPrivateKey) {
    throw new Error('WALLET_PRIVATE_KEY is required');
}
// Create the wallet account
const account = privateKeyToAccount(walletPrivateKey);
// Use type assertion for clients to handle type compatibility with viem
const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
});
const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
});
// Set up services
const neynarApiKey = process.env.NEYNAR_API_KEY;
const signerUuid = process.env.SIGNER_UUID;
const botFid = process.env.BOT_FID;
if (!neynarApiKey || !signerUuid || !botFid) {
    throw new Error('NEYNAR_API_KEY, SIGNER_UUID, and BOT_FID are required');
}
const neynarService = new NeynarService(neynarApiKey, signerUuid, parseInt(botFid));
const zoraService = new ZoraService(walletClient, publicClient);
const botService = new BotService(neynarService, zoraService);
// Create the Express app
const app = express();
app.use(cors());
app.use(express.json());
// Root route handler
const rootHandler = (_req, res) => {
    res.send('Zoiner Bot - A Farcaster bot that creates Zora ERC20 coins from images');
};
// Metadata endpoint for Zora
app.get('/metadata', (_req, res) => {
    // This endpoint serves valid Zora metadata for the workshop
    res.json({
        name: "Zoiner Workshop Token",
        description: "Token created during the Zoiner bot workshop on Farcaster",
        image: "https://i.postimg.cc/VkgLgc4Z/happybirthday.png",
        properties: {
            category: "social"
        }
    });
});
// Webhook verification endpoint handler
const webhookGetHandler = (req, res) => {
    const challenge = req.query.challenge;
    if (challenge) {
        return res.status(200).json({ challenge });
    }
    res.status(400).send('Missing challenge parameter');
};
// Webhook endpoint handler
const webhookPostHandler = async (req, res) => {
    try {
        const event = req.body;
        // Always respond with 200 quickly to acknowledge receipt
        res.status(200).send('OK');
        // Process the event asynchronously
        if (event.type === 'cast.created') {
            console.log(`Received cast.created event for cast ${event.data.hash}`);
            // Process the cast
            await botService.processCast(event.data.hash);
        }
        else {
            console.log(`Ignoring event of type: ${event.type}`);
        }
    }
    catch (error) {
        console.error('Error processing webhook event:', error);
        // No need to send error response, we already sent 200
    }
};
// Setup routes
app.get('/', rootHandler);
app.get('/webhook', webhookGetHandler);
app.post('/webhook', webhookPostHandler);
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
