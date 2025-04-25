# 🪄 Build a Magic Meme-to-Money Bot Workshop

**Time**: ~1 hour  
**Level**: Beginner-Intermediate  
**Tech**: Farcaster + Zora + TypeScript  

## 🌟 What We're Building

Ever wanted to turn your memes into money? Today we're building **Zoiner**, a Farcaster bot that listens for mentions and automagically creates ERC20 tokens from images! Post a pic, tag the bot, and BOOM - you've got your own token on Base. 

It's like an alchemy machine that turns JPEGs into coins. The perfect meme-to-money pipeline!

## 🧰 Prerequisites

This is a hands-on workshop! We'll help you get set up, but having these ready will save time:

- [ ] Node.js (v16+) installed
- [ ] A Farcaster account (for testing)
- [ ] Basic familiarity with TypeScript/JavaScript
- [ ] Wallet with a small amount of ETH on Base (~0.01 ETH)
- [ ] Neynar account (we'll create one during the workshop)

Don't worry if you're missing something - just partner up with another attendee!

## 🗺️ Workshop Roadmap

### 1. Setup & Orientation (10 min)
- Clone the starter repo
- Install dependencies
- Overview of project structure
- Understanding the Farcaster <> Zora ecosystem

### 2. Building the Bot Core (15 min)
- Configure Neynar client
- Building the image extraction logic
- Setting up webhook handlers

### 3. The Money Magic (15 min)
- Connecting to Zora's SDK
- Understanding ERC20 token creation
- Processing token creation requests

### 4. Test & Deploy (15 min)
- Getting a Neynar signer
- Testing the bot locally
- Deploying our webhook
- Creating our first token!

### 5. Wrap-up & Extensions (5 min)
- What we learned
- Ideas for extending your bot
- Resources for continued learning

## 🚀 Let's Begin!

### Step 1: Clone & Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/homebase-workshop.git
cd homebase-workshop

# Install dependencies
npm install

# Copy example environment file
cp README-ENV-EXAMPLE.md .env
```

Open the `.env` file and fill in your values (we'll help with this during the workshop!).

### Step 2: Understanding the Code Structure

Our project has a few key components:

- **Webhook Server**: Receives mentions from Farcaster
- **Neynar Service**: Communicates with Farcaster
- **Zora Service**: Creates ERC20 tokens
- **Bot Service**: Orchestrates the whole process

Take a moment to explore the folders:
- `src/types`: TypeScript definitions
- `src/services`: Core services
- `src/utils`: Helper functions

### Step 3: The Core Logic

The interesting bits:

```typescript
// This is where the magic happens!
// When a user tags our bot with an image...
async processCoinCreationRequest(cast: FarcasterCast): Promise<void> {
  // Extract the image
  const imageUrl = await extractImageFromCast(cast);
  
  // Get the creator's address
  const creatorAddress = await this.neynarService.getUserEthereumAddress(cast.author.fid);
  
  // Create a token on Zora
  const result = await this.zoraService.createCoin({
    name: coinRequest.name,
    symbol: coinRequest.symbol,
    uri: imageUrl,
    payoutRecipient: creatorAddress
  });
  
  // Reply with the new token details
  await this.neynarService.replyToCast(
    cast.author.fid,
    cast.hash,
    `🎉 Successfully created your token: ${result.address}`
  );
}
```

### Step 4: Getting a Farcaster Signer

During the workshop, we'll:

1. Sign up for a Neynar account
2. Create a dedicated signer
3. Approve it on Optimism
4. Update our .env file

> **Workshop Shortcut**: If you're having trouble setting up a signer, use our workshop test signer (valid for 24h only).

### Step 5: Testing & Running

```bash
# Build the project
npm run build

# Start the server
npm start
```

For testing, we'll use ngrok to expose our local server:

```bash
# In a new terminal
ngrok http 3000
```

Then set up a webhook in Neynar dashboard pointing to your ngrok URL.

### Step 6: Your First Token!

1. Post an image on Farcaster
2. Tag the bot: `@zoiner coin this content: name: WorkshopCoin ticker: WKSP`
3. Watch the magic happen!

## 💡 Workshop Challenges

Finished early? Try these extensions:

1. **Custom Token Art**: Modify the image processing to add filters or text
2. **Token Traits**: Add metadata based on image analysis
3. **Multiple Images**: Support creating coins from multiple images in a post

## 🤝 Need Help?

- Raise your hand
- Check the troubleshooting section below
- Partner with a neighbor

## 🔧 Troubleshooting Common Issues

- **Webhook not receiving events?** Check your ngrok URL and Neynar webhook settings
- **No replies from bot?** Verify your signer is properly approved
- **Token creation fails?** Ensure your wallet has ETH on Base

## 📚 Resources

- [Neynar Documentation](https://docs.neynar.com/)
- [Zora Coins SDK](https://docs.zora.co/coins/sdk/getting-started)
- [Farcaster Developers](https://docs.farcaster.xyz/)
- [Workshop Slides](https://example.com/slides) (Available after the workshop)

## 🎉 Congratulations!

You've built a bot that turns memes into money! Now go forth and create ridiculous tokens for all your favorite images. 