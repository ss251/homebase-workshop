# Zoiner Bot

A Farcaster bot that creates Zora ERC20 coins from images.

## Overview

Zoiner is a bot that monitors Farcaster for mentions and creates Zora ERC20 tokens from images. Users can tag the bot in a post with an image and specify coin details to mint a new token on the Base network.

## Features

- Create ERC20 tokens on Zora with a single post on Farcaster
- Use images from posts as the token icon
- Automatic payout recipient setting based on verified Ethereum address
- Simple syntax for token creation

## How to Use

1. Make sure your Farcaster profile has a verified Ethereum address
2. Create a post with an image
3. Tag @zoiner with the following text:
   ```
   coin this content: name: YourCoinName ticker: YCN
   ```
4. The bot will automatically process your request and reply with the token details once created

## Technology Stack

- [Neynar SDK](https://docs.neynar.com/) - For Farcaster integration
- [Zora Coins SDK](https://docs.zora.co/coins/sdk/getting-started) - For ERC20 token creation
- [Viem](https://viem.sh/) - For Ethereum interactions
- TypeScript - Core language
- Express - Web server for webhook processing

## Setup

### Prerequisites

- Node.js 18+
- Farcaster account with a signer
- Ethereum wallet with funds on Base
- API keys for Neynar

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zoiner-bot.git
   cd zoiner-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```
   # API Keys
   NEYNAR_API_KEY=your_neynar_api_key
   SIGNER_UUID=your_neynar_signer_uuid
   BOT_FID=your_bot_fid

   # Wallet Configuration
   WALLET_PRIVATE_KEY=your_private_key
   RPC_URL=https://mainnet.base.org

   # Bot Configuration
   BOT_NAME=zoiner
   PORT=3000
   ```

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the server:
   ```bash
   npm start
   ```

6. Set up a Neynar webhook pointing to your server's `/webhook` endpoint with the following filters:
   - Event type: `cast.created`
   - Mentioned FIDs: `your_bot_fid`

## Development

For local development, you can run:
```bash
npm run dev
```

## License

MIT

## Credits

This project uses:
- [Neynar Farcaster SDK](https://github.com/neynarxyz/nodejs-sdk)
- [Zora Coins SDK](https://github.com/zoraxyz/coins-sdk)
- [Viem](https://viem.sh/) 