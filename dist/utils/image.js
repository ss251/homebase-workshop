import axios from 'axios';
// Default image to use when no image is found in the cast
const DEFAULT_IMAGE_URL = 'https://i.postimg.cc/VkgLgc4Z/happybirthday.png';
/**
 * Extract image URL from a Farcaster cast
 * @param cast The Farcaster cast object
 * @returns The first valid image URL found or the default image URL
 */
export async function extractImageFromCast(cast) {
    console.log('DEBUG - Attempting to extract image from cast:', cast.hash);
    console.log('DEBUG - Cast data for image extraction:', JSON.stringify(cast, null, 2));
    // Check for already extracted image URLs
    if (cast.image_urls && cast.image_urls.length > 0) {
        console.log('DEBUG - Found image_urls:', cast.image_urls);
        for (const imageUrl of cast.image_urls) {
            if (await verifyImageUrl(imageUrl)) {
                console.log('DEBUG - Verified image URL from image_urls:', imageUrl);
                return imageUrl;
            }
        }
    }
    // Check embedded media (embedsMedia in API response)
    if (cast.embedded_media && cast.embedded_media.length > 0) {
        console.log('DEBUG - Found embedded_media:', JSON.stringify(cast.embedded_media));
        for (const media of cast.embedded_media) {
            if (media.url &&
                (media.url.endsWith('.jpg') ||
                    media.url.endsWith('.jpeg') ||
                    media.url.endsWith('.png') ||
                    media.url.endsWith('.gif') ||
                    (media.type && media.type.startsWith('image/')))) {
                console.log('DEBUG - Found potential image in embedded_media:', media.url);
                if (await verifyImageUrl(media.url)) {
                    console.log('DEBUG - Verified image URL from embedded_media:', media.url);
                    return media.url;
                }
            }
        }
    }
    // Check embeds
    if (cast.embeds && cast.embeds.length > 0) {
        console.log('DEBUG - Found embeds:', JSON.stringify(cast.embeds));
        for (const embed of cast.embeds) {
            if (embed.image) {
                console.log('DEBUG - Found image directly in embed.image:', embed.image);
                if (await verifyImageUrl(embed.image)) {
                    console.log('DEBUG - Verified image URL from embed.image:', embed.image);
                    return embed.image;
                }
            }
            if (embed.url &&
                (embed.url.endsWith('.jpg') ||
                    embed.url.endsWith('.jpeg') ||
                    embed.url.endsWith('.png') ||
                    embed.url.endsWith('.gif') ||
                    (embed.mimetype && embed.mimetype.startsWith('image/')))) {
                console.log('DEBUG - Found potential image in embeds.url:', embed.url);
                if (await verifyImageUrl(embed.url)) {
                    console.log('DEBUG - Verified image URL from embeds.url:', embed.url);
                    return embed.url;
                }
            }
        }
    }
    // Direct attachments field if available
    if (cast.attachments && Array.isArray(cast.attachments)) {
        console.log('DEBUG - Found attachments field:', JSON.stringify(cast.attachments));
        for (const attachment of cast.attachments) {
            if (typeof attachment === 'string') {
                // If it's directly a string URL
                if (await verifyImageUrl(attachment)) {
                    console.log('DEBUG - Verified image URL from attachments (string):', attachment);
                    return attachment;
                }
            }
            else if (attachment.url) {
                // If it's an object with a URL
                if (await verifyImageUrl(attachment.url)) {
                    console.log('DEBUG - Verified image URL from attachments.url:', attachment.url);
                    return attachment.url;
                }
            }
        }
    }
    // No image found, use default image
    console.log('DEBUG - No valid image found in cast, using default image:', DEFAULT_IMAGE_URL);
    return DEFAULT_IMAGE_URL;
}
/**
 * Verify if a URL points to a valid image
 * @param url The URL to verify
 * @returns True if the URL points to a valid image
 */
async function verifyImageUrl(url) {
    try {
        console.log('DEBUG - Verifying image URL:', url);
        const response = await axios.head(url);
        const contentType = response.headers['content-type'];
        const isImage = contentType && contentType.startsWith('image/');
        console.log('DEBUG - Image verification result:', { url, contentType, isImage });
        return isImage;
    }
    catch (error) {
        console.error('Error verifying image URL:', url, error);
        return false;
    }
}
/**
 * Convert an image URL to a data URI format if needed for Zora
 * @param imageUrl The image URL to process
 * @returns Promise resolving to the processed image URL (as-is for now)
 */
export async function prepareImageForZora(imageUrl) {
    // For now we just return the URL directly
    // In a production system, you'd likely want to upload to IPFS or handle differently
    return imageUrl;
}
