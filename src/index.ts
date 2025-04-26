import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

import { NeynarService } from './services/neynar.js';
import { ZoraService } from './services/zora.js';
import { BotService } from './services/bot.js';
import { WebhookEvent } from './types/index.js';

// Load environment variables
console.log('Loading environment variables from .env file...');
dotenv.config();

// Debug environment variables
console.log('DEBUG - Environment Variables:');
console.log('NEYNAR_API_KEY:', process.env.NEYNAR_API_KEY ? '[REDACTED]' : 'NOT SET');
console.log('SIGNER_UUID:', process.env.SIGNER_UUID ? '[PRESENT]' : 'NOT SET');
console.log('BOT_FID:', process.env.BOT_FID);
console.log('BOT_NAME:', process.env.BOT_NAME);
console.log('PINATA_JWT:', process.env.PINATA_JWT ? '[PRESENT]' : 'NOT SET');
console.log('GATEWAY_URL:', process.env.GATEWAY_URL || 'tan-obvious-puffin-912.mypinata.cloud (default)');

// Set up wallet for Zora interactions
const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
if (!walletPrivateKey) {
  throw new Error('WALLET_PRIVATE_KEY is required');
}

// Create the wallet account
const account = privateKeyToAccount(walletPrivateKey as `0x${string}`);

// Use type assertion for clients to handle type compatibility with viem
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
}) as any;

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.RPC_URL || 'https://mainnet.base.org')
}) as any;

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
const rootHandler = (_req: any, res: any) => {
  res.send('Zoiner Bot - A Farcaster bot that creates Zora ERC20 coins from images');
};

// Metadata endpoint for Zora
app.get('/metadata', (req, res) => {
  // Get the metadata values from query parameters or use defaults
  const { name, symbol, image } = req.query;
  
  // Generate metadata with the parameters or fall back to defaults
  const metadata = {
    name: name || "Zoiner Workshop Token",
    description: (name || "Zoiner Workshop Token") + " - Created with Zoiner on Farcaster",
    symbol: symbol || "ZOINER",
    image: image || "https://i.postimg.cc/VkgLgc4Z/happybirthday.png",
    properties: {
      category: "social"
    }
  };
  
  // Set the content type to application/json
  res.setHeader('Content-Type', 'application/json');
  res.json(metadata);
});

// Webhook verification endpoint handler
const webhookGetHandler = (req: any, res: any) => {
  const challenge = req.query.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }
  res.status(400).send('Missing challenge parameter');
};

// Webhook endpoint handler
app.post('/webhook', async (req, res) => {
  console.log('Received webhook event:', req.body.type);
  
  try {
    // Validate the event
    const event = req.body as WebhookEvent;
    
    // Only process cast.created events
    if (event.type === 'cast.created') {
      const castHash = event.data.hash;
      console.log(`Received cast.created event for cast ${castHash}`);
      
      // Process the cast asynchronously to not block the webhook response
      botService.processCast(castHash).catch(err => {
        console.error(`Error processing cast ${castHash}:`, err);
      });
    }
    
    // Always return 200 OK for webhook events
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Setup routes
app.get('/', rootHandler);
app.get('/webhook', webhookGetHandler);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 