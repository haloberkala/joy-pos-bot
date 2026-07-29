/**
 * Utility functions for product name generation
 * 
 * Architecture:
 * 1. Normalizer - Clean and standardize input text
 * 2. Phrase Dictionary - Multi-word phrase replacements
 * 3. Word Dictionary - Single word abbreviations
 * 4. Abbreviator - Apply dictionary lookups
 * 5. Formatter - Final formatting and truncation
 */

// ═══════════════════════════════════════════════════════════════════
// DICTIONARIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Phrase Dictionary - Multi-word phrases that should be replaced as a whole
 * Priority: Apply BEFORE single-word abbreviations
 */
const PHRASE_DICTIONARY: Record<string, string> = {
  // Compound materials
  "kayu dan besi": "Ky&Bs",
  "cat kayu dan besi": "CKB",
  
  // Colors with modifiers
  "super white": "SW",
  "super black": "SB",
  "semi gloss": "SG",
  
  // Types
  "water based": "WB",
  "oil based": "OB",
  "interior exterior": "Int&Ext",
};

/**
 * Word Dictionary - Single word abbreviations
 * Applied after phrase replacements
 */
const WORD_DICTIONARY: Record<string, string> = {
  // Materials
  "kayu": "Ky",
  "besi": "Bs",
  "beton": "Btn",
  "aluminium": "Alum",
  "alumunium": "Alum",
  "plastik": "Pls",
  "kaca": "Kc",
  
  // Paint types & finishes
  "cat": "Cat",
  "gloss": "Gloss",
  "doff": "Doff",
  "matte": "Matte",
  "acrylic": "Acr",
  
  // Colors
  "white": "Wht",
  "black": "Blk",
  "merah": "Mrh",
  "biru": "Bru",
  "hijau": "Hju",
  "kuning": "Kng",
  "putih": "Pth",
  "hitam": "Htm",
  
  // Sizes
  "besar": "Bsr",
  "kecil": "Kcl",
  "sedang": "Sdg",
  "panjang": "Pjg",
  "pendek": "Pdk",
  
  // Quality & types
  "premium": "Prem",
  "economy": "Eco",
  "super": "Spr",
  "interior": "Int",
  "exterior": "Ext",
};

/**
 * Connector words to be replaced with '&'
 */
const CONNECTORS = ["dan", "dengan", "untuk", "yg", "yang"];

// ═══════════════════════════════════════════════════════════════════
// NORMALIZER MODULE
// ═══════════════════════════════════════════════════════════════════

/**
 * Normalize text: clean spacing, standardize units, fix formatting
 */
function normalizeText(text: string): string {
  if (!text) return "";
  
  let normalized = text.trim();
  
  // Replace multiple spaces with single space
  normalized = normalized.replace(/\s+/g, " ");
  
  // Standardize unit notation: "0,9 L" → "0.9L", "1,5 kg" → "1.5kg"
  normalized = normalized.replace(/(\d+),(\d+)\s*([a-zA-Z]+)/g, "$1.$2$3");
  
  // Standardize spacing around numbers with units: "500 ml" → "500ml"
  normalized = normalized.replace(/(\d+)\s+([a-zA-Z]+)/g, "$1$2");
  
  return normalized.trim();
}

// ═══════════════════════════════════════════════════════════════════
// PHRASE REPLACEMENT MODULE
// ═══════════════════════════════════════════════════════════════════

/**
 * Apply phrase dictionary - replaces multi-word phrases BEFORE word abbreviation
 * This preserves semantic meaning better than individual word replacement
 */
function applyPhraseReplacement(text: string): string {
  let result = text;
  
  // Sort by length (longest first) to handle overlapping phrases correctly
  const phrases = Object.keys(PHRASE_DICTIONARY).sort((a, b) => b.length - a.length);
  
  for (const phrase of phrases) {
    const replacement = PHRASE_DICTIONARY[phrase];
    // Case-insensitive whole phrase match
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// WORD ABBREVIATION MODULE
// ═══════════════════════════════════════════════════════════════════

/**
 * Apply word-level abbreviations
 * Only abbreviates words found in dictionary - preserves unknown words
 */
function applyWordAbbreviation(text: string): string {
  // Split into words
  const words = text.split(/\s+/);
  
  const abbreviated = words.map((word) => {
    // Preserve special characters like & (from phrase replacement or connector replacement)
    if (word === "&" || word === "&&") return "&";
    
    // Preserve numbers and units (already normalized)
    if (/^\d+/.test(word)) return word;
    
    // Check dictionary (case-insensitive)
    const lowerWord = word.toLowerCase();
    if (WORD_DICTIONARY[lowerWord]) {
      return WORD_DICTIONARY[lowerWord];
    }
    
    // NOT IN DICTIONARY: Preserve original word
    // DO NOT remove vowels blindly - readability is priority
    return word;
  });
  
  return abbreviated.join(" ");
}

// ═══════════════════════════════════════════════════════════════════
// CONNECTOR REPLACEMENT MODULE
// ═══════════════════════════════════════════════════════════════════

/**
 * Replace connector words with '&' symbol
 */
function replaceConnectors(text: string): string {
  let result = text;
  
  for (const connector of CONNECTORS) {
    const regex = new RegExp(`\\b${connector}\\b`, 'gi');
    result = result.replace(regex, '&');
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// FORMATTER MODULE
// ═══════════════════════════════════════════════════════════════════

/**
 * Final formatting: cleanup spacing, truncate to max length
 */
function formatShortName(text: string, maxLength: number = 30): string {
  // Clean up multiple spaces
  let formatted = text.replace(/\s+/g, " ").trim();
  
  // Clean up multiple ampersands
  formatted = formatted.replace(/&+/g, "&");
  
  // Clean up spaces around ampersands for compactness
  formatted = formatted.replace(/\s*&\s*/g, "&");
  
  // Truncate at word boundary if too long
  if (formatted.length > maxLength) {
    // Try to cut at last space before maxLength
    const truncated = formatted.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    
    if (lastSpace > maxLength * 0.6) {
      // If we can cut at a reasonable word boundary, do it
      formatted = truncated.substring(0, lastSpace).trim();
    } else {
      // Otherwise just hard truncate
      formatted = truncated.trim();
    }
  }
  
  return formatted;
}

// ═══════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════

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
 * 
 * Pipeline:
 * 1. Normalize → 2. Phrase Replace → 3. Connector Replace → 4. Word Abbreviate → 5. Format
 * 
 * Example:
 * "Avian Cat Kayu dan Besi Gloss Super White 0,9 L"
 * → "Avian Cat Kayu dan Besi Gloss Super White 0.9L" (normalize)
 * → "Avian CKB Gloss Super White 0.9L" (phrase: "Cat Kayu dan Besi" → "CKB")
 * → "Avian CKB Gloss SW 0.9L" (phrase: "Super White" → "SW")
 * → "Avian CKB Gloss SW 0.9L" (connectors - none left)
 * → "Avian CKB Gloss SW 0.9L" (word abbreviation - "Gloss" preserved as is)
 * → "Avian CKB Gloss SW 0.9L" (format - within 30 chars)
 */
export function generateShortName(fullProductName: string): string {
  if (!fullProductName) return "";
  
  // Step 1: Normalize
  let result = normalizeText(fullProductName);
  
  // Step 2: Apply phrase replacements (BEFORE word-level)
  result = applyPhraseReplacement(result);
  
  // Step 3: Replace connectors with &
  result = replaceConnectors(result);
  
  // Step 4: Apply word-level abbreviations
  result = applyWordAbbreviation(result);
  
  // Step 5: Format and truncate
  result = formatShortName(result, 30);
  
  return result;
}
