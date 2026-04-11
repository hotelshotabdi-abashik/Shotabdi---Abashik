import axios from 'axios';
import { toast } from 'sonner';

const VISION_API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_VISION_API_KEY || 'AIzaSyDSoX9cA-KrrXaGM8f3EmcpNOsWsBIkY3A';

export interface NIDData {
  legalName: string;
  nidNumber: string;
  dateOfBirth?: string;
}

export const extractNIDInfo = async (imageBase64: string): Promise<NIDData | null> => {
  try {
    const response = await axios.post('/api/vision/extract', {
      imageBase64,
    });

    const textAnnotations = response.data.responses[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return null;
    }

    const fullText = textAnnotations[0].description;
    console.log('Extracted Text:', fullText);

    // Basic regex patterns for NID (this might need adjustment based on card format)
    // Example patterns for Bangladesh NID
    const lines = fullText.split('\n');
    let legalName = '';
    let nidNumber = '';

    // Search for Name and NID Number
    // Note: NID formats vary, these are common patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for NID Number (usually 10, 13, or 17 digits)
      const nidMatch = line.match(/\d{10,17}/);
      if (nidMatch && !nidNumber) {
        nidNumber = nidMatch[0];
      }

      // Look for Name (usually follows "Name:" or "নাম:")
      if (line.toLowerCase().includes('name') || line.includes('নাম')) {
        // Often the name is on the next line or after the colon
        const namePart = line.split(/[:ঃ]/)[1]?.trim();
        if (namePart) {
          legalName = namePart;
        } else if (i + 1 < lines.length) {
          legalName = lines[i + 1].trim();
        }
      }
    }

    // Fallback if name not found via label
    if (!legalName) {
      // Often the name is one of the first few lines in large font
      // This is a heuristic
      legalName = lines[1] || lines[0];
    }

    return {
      legalName,
      nidNumber,
    };
  } catch (error: any) {
    const message = error.response?.data?.error || error.message;
    console.error('Vision API Proxy Error:', message);
    toast.error(`Verification Error: ${message}`);
    return null;
  }
};
