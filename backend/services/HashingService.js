const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');

class HashingService {
    /**
     * Generates a content-based hash and extracts metadata features
     * @param {Buffer} buffer - File buffer
     * @param {string} mimetype - File mimetype
     * @returns {Promise<Object>} - { hashValue: string, extractedData: Object }
     */
    static async generateHashAndMetadata(buffer, mimetype) {
        try {
            console.log(`[HashingService] Processing ${mimetype}...`);
            let cleanText = "";

            try {
                if (mimetype === 'application/pdf') {
                    const data = await pdfParse(buffer);
                    console.log(`\n[HashingService] --- RAW EXTRACTED PDF TEXT START ---\n${data && data.text ? data.text : "NO TEXT"}\n--- RAW EXTRACTED PDF TEXT END ---\n`);
                    cleanText = (data && data.text) ? data.text.replace(/\s+/g, ' ').trim().toLowerCase() : "";
                    console.log(`[HashingService] Extracted ${cleanText.length} characters from PDF.`);
                } else if (mimetype && mimetype.startsWith('image/')) {
                    // OCR for Text images
                    const img = sharp(buffer);
                    
                    const normalizedImage = await img
                        .grayscale()
                        .normalize()
                        .toBuffer();

                    const { data: { text } } = await Tesseract.recognize(normalizedImage, 'eng');
                    console.log(`\n[HashingService] --- RAW EXTRACTED TEXT START ---\n${text}\n--- RAW EXTRACTED TEXT END ---\n`);
                    cleanText = (text || "").replace(/\s+/g, ' ').trim().toLowerCase();
                    console.log(`[HashingService] OCR extracted ${cleanText.length} characters.`);
                } else {
                    console.log(`[HashingService] Unsupported mimetype: ${mimetype}`);
                    cleanText = "";
                }
            } catch (innerErr) {
                console.error('[HashingService] Inner Parsing Error:', innerErr);
                require('fs').writeFileSync('hashing_inner_err.log', innerErr.stack || innerErr.toString());
                cleanText = ""; // Safe fallback on parse failure
            }

            // Extract specific baseline fields safely
            // Name: grab up to 3 words after "name" or "name of student", stopping before known keywords
            const nameMatch = cleanText ? cleanText.match(/name(?: of (?:student|candidate))?\s*[:\-]?\s*((?:(?!roll|reg|dob|date|no\b)[a-z]\s*){2,30})/i) : null;
            const hasSeal = cleanText ? /seal|stamp|authorized\s*sign/i.test(cleanText) : false;
            const hasLogo = cleanText ? /logo|university|college|institute|academy/i.test(cleanText) : false;

            const extractedData = {
                Name: nameMatch ? nameMatch[1].replace(/[^a-zA-Z\s]/g, '').trim() : 'Not Found',
                'Seal Detected': hasSeal ? 'Yes' : 'No',
                'Logo Detected': hasLogo ? 'Yes' : 'No'
            };

            if (cleanText) {
                // Dynamically extract any key-value pairs where the value contains numbers
                // Matches 1 to 4 words as key, optional colon/dash, then a value containing numbers
                const dynamicRegex = /([a-z]+(?:\s+[a-z]+){0,3})\s*[:\-]?\s*([a-z0-9]*\d[\w\.\-\/]*)/gi;
                let match;
                while ((match = dynamicRegex.exec(cleanText)) !== null) {
                    let key = match[1].trim();
                    let value = match[2].trim();
                    
                    // Format the key to be Title Case for display
                    key = key.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    
                    // Filter out irrelevant keys or duplicates
                    if (key.length >= 3 && key.toLowerCase() !== 'name') {
                        extractedData[key] = value;
                    }
                }
            }

            // Generate Hash based only on the cleaned text content
            const hashValue = crypto.createHash('sha256')
                .update(`TEXT:${cleanText}`)
                .digest('hex');

            return { hashValue, extractedData };

        } catch (error) {
            console.error('[HashingService] Critical Logic Error:', error);
            require('fs').writeFileSync('hashing_critical_err.log', error.stack || error.toString());
            // Safe fallback ensuring UI doesn't crash, but still indicates an issue
            return {
                hashValue: crypto.createHash('sha256').update(buffer || '').digest('hex'),
                extractedData: { Name: 'Error Processing', 'Seal Detected': 'Error', 'Logo Detected': 'Error' }
            };
        }
    }
}

module.exports = HashingService;
