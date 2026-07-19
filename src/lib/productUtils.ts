/**
 * Utility functions for product name generation
 */

/**
 * Generate full product name based on master data
 */
export function generateProductName({
  brandName,
  mainProductName,
  variantName,
  specificationName,
  sizeName,
}: {
  brandName?: string | null;
  mainProductName?: string | null;
  variantName?: string | null;
  specificationName?: string | null;
  sizeName?: string | null;
}): string {
  const parts = [
    brandName,
    mainProductName,
    variantName,
    specificationName,
    sizeName,
  ];

  // Filter out null/undefined/empty, trim each part, and join with space
  return parts
    .filter((part) => part && part.trim() !== "")
    .map((part) => part?.trim())
    .join(" ");
}

/**
 * Generate a short name (max 30 chars) from the full product name
 * Uses abbreviation dictionary and replaces connector words with '&'
 */
export function generateShortName(fullProductName: string): string {
  if (!fullProductName) return "";

  // 1. Replace connector words with '&'
  const connectors = ["dan", "dengan", "untuk", "yg", "yang"];
  let processedName = fullProductName;
  
  // Replace each connector with '&' (case insensitive, whole word match)
  connectors.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    processedName = processedName.replace(regex, '&');
  });

  // Split into words for dictionary abbreviation
  let words = processedName.split(/\s+/);

  // 2. Dictionary abbreviation mapping
  const dictionary: Record<string, string> = {
    "kayu": "Ky",
    "besi": "Bs",
    "gloss": "Gls",
    "super": "Spr",
    "white": "Wht",
    "black": "Blk",
    "merah": "Mrh",
    "biru": "Bru",
    "hijau": "Hju",
    "kuning": "Kng",
    "besar": "Bsr",
    "kecil": "Kcl",
    "sedang": "Sdg",
    "panjang": "Pjg",
    "pendek": "Pdk"
  };

  // 3. Apply abbreviation logic
  words = words.map((word) => {
    // Skip if it's our ampersand
    if (word === "&") return word;

    const lowerWord = word.toLowerCase();
    
    // If in dictionary, use abbreviation
    if (dictionary[lowerWord]) {
      return dictionary[lowerWord];
    }

    // Optional: remove vowels if word is long and not in dictionary, 
    // to save space, but keeping first letter.
    if (word.length > 5 && isNaN(Number(word))) {
      const firstChar = word.charAt(0);
      const rest = word.slice(1);
      const withoutVowels = rest.replace(/[aeiouAEIOU]/g, '');
      return firstChar + withoutVowels;
    }

    return word;
  });

  // 4 & 5. Rejoin and truncate to 30 chars
  let shortName = words.join(" ");
  
  // Cleanup any double spaces that might have occurred
  shortName = shortName.replace(/\s+/g, ' ').trim();

  if (shortName.length > 30) {
    shortName = shortName.substring(0, 30).trim();
  }

  return shortName;
}
