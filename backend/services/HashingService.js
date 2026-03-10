const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');

class HashingService {
    /**
     * Generates a content-based hash by extracting text and logo features
     * @param {Buffer} buffer - File buffer
     * @param {string} mimetype - File mimetype
     * @returns {Promise<string>} - SHA-256 hash string
     */
    static async generateContentHash(buffer, mimetype) {
        try {
            console.log(`[HashingService] Processing ${mimetype}...`);

            let cleanText = "";
            let visualHash = "";

            if (mimetype === 'application/pdf') {
                const data = await pdfParse(buffer);
                cleanText = data.text.replace(/\s+/g, ' ').trim().toLowerCase();
                console.log(`[HashingService] Extracted ${cleanText.length} characters from PDF.`);
            } else {
                // Preprocess for both OCR and pHash
                const img = sharp(buffer);
                const metadata = await img.metadata();

                // 1. OCR for Text
                const normalizedImage = await img
                    .grayscale()
                    .normalize()
                    .toBuffer();

                const { data: { text } } = await Tesseract.recognize(normalizedImage, 'eng');
                cleanText = text.replace(/\s+/g, ' ').trim().toLowerCase();
                console.log(`[HashingService] OCR extracted ${cleanText.length} characters.`);

                // 2. Custom Average Hash (aHash) for Logos
                // Resize to 8x8 and get raw grayscale data
                const tinyImg = await sharp(buffer)
                    .resize(8, 8, { fit: 'fill' })
                    .grayscale()
                    .raw()
                    .toBuffer(); // 64 bytes total

                const avg = tinyImg.reduce((sum, val) => sum + val, 0) / 64;
                visualHash = tinyImg.map(pixel => pixel > avg ? "1" : "0").join("");
                console.log(`[HashingService] Visual fingerprint (aHash) generated.`);
            }

            // 3. Finalize
            const combinedIdentifier = `TEXT:${cleanText}|VISUAL:${visualHash}`;

            return crypto.createHash('sha256')
                .update(combinedIdentifier)
                .digest('hex');

        } catch (error) {
            console.error('[HashingService] Logic Error:', error);
            // Fallback to standard buffer hash
            return crypto.createHash('sha256').update(buffer).digest('hex');
        }
    }
}

module.exports = HashingService;
