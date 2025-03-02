// Map ISO country codes to language codes
export const countryToLanguageMap: Record<string, string> = {
  // Chinese-speaking regions
  CN: 'zh', // China
  TW: 'zh', // Taiwan
  HK: 'zh', // Hong Kong

  // Spanish-speaking regions
  ES: 'es', // Spain
  MX: 'es-ar', // Mexico (South American Spanish variant)
  AR: 'es-ar', // Argentina
  CL: 'es-ar', // Chile
  CO: 'es-ar', // Colombia
  PE: 'es-ar', // Peru
  VE: 'es-ar', // Venezuela

  // Portuguese-speaking regions
  PT: 'pt', // Portugal
  BR: 'pt-br', // Brazil

  // Russian-speaking regions
  RU: 'ru', // Russia
  BY: 'ru', // Belarus
  KZ: 'ru', // Kazakhstan

  // Turkish-speaking regions
  TR: 'tr', // Turkey
};

// Add country codes with multiple languages - we'll prioritize one language per country
// These override any previous assignments
const multiLanguageCountries: Record<string, string> = {
  // Countries with multiple languages - we prioritize one
  CH: 'de', // Switzerland (German, French, Italian) - prioritize German
  BE: 'fr', // Belgium (Dutch, French) - prioritize French
  CA: 'en', // Canada (English, French) - prioritize English

  // African countries with multiple languages
  ZA: 'en', // South Africa (many languages) - prioritize English
  NG: 'en', // Nigeria (English, Igbo, Yoruba) - prioritize English

  // Add more as needed
};

// Merge the maps
Object.assign(countryToLanguageMap, multiLanguageCountries);

// Additional language mappings
const additionalLanguageMappings: Record<string, string> = {
  // French-speaking regions
  FR: 'fr', // France

  // German-speaking regions
  DE: 'de', // Germany
  AT: 'de', // Austria

  // Dutch-speaking regions
  NL: 'nl', // Netherlands

  // Italian-speaking regions
  IT: 'it', // Italy

  // Polish-speaking regions
  PL: 'pl', // Poland

  // Swahili-speaking regions
  KE: 'sw', // Kenya
  TZ: 'sw', // Tanzania
  UG: 'sw', // Uganda

  // Arabic-speaking regions
  SA: 'ar', // Saudi Arabia
  EG: 'ar', // Egypt
  MA: 'ar', // Morocco
  DZ: 'ar', // Algeria
  TN: 'ar', // Tunisia
  JO: 'ar', // Jordan

  // Hebrew-speaking regions
  IL: 'he', // Israel

  // Farsi/Persian-speaking regions
  IR: 'fa', // Iran
  AF: 'fa', // Afghanistan (partial)

  // Scandinavian languages
  SE: 'sv', // Sweden
  FI: 'fi', // Finland
  DK: 'da', // Denmark

  // More African languages can be added based on predominant language per country
  GH: 'ak', // Ghana - Ashanti/Twi
};

// Merge additional mappings
Object.assign(countryToLanguageMap, additionalLanguageMappings);

// Get suggested language from country code
export function getSuggestedLanguage(countryCode: string): string | null {
  return countryToLanguageMap[countryCode] || null;
}