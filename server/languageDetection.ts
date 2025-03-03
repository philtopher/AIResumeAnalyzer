import geoip from 'geoip-lite';

// Map countries to their primary languages
const countryLanguageMap: Record<string, string> = {
  // Asia
  CN: 'zh', // China
  TW: 'zh', // Taiwan
  HK: 'zh', // Hong Kong
  
  // Middle East
  TR: 'tr', // Turkey
  SA: 'ar', // Saudi Arabia
  AE: 'ar', // UAE
  EG: 'ar', // Egypt
  IL: 'he', // Israel
  IR: 'fa', // Iran
  
  // Europe
  RU: 'ru', // Russia
  PT: 'pt', // Portugal
  BR: 'pt', // Brazil
  ES: 'es', // Spain
  MX: 'es', // Mexico
  AR: 'es', // Argentina
  CO: 'es', // Colombia
  FR: 'fr', // France
  CA: 'fr', // Canada (French regions)
  DE: 'de', // Germany
  AT: 'de', // Austria
  CH: 'de', // Switzerland
  NL: 'nl', // Netherlands
  BE: 'nl', // Belgium
  IT: 'it', // Italy
  PL: 'pl', // Poland
  
  // Africa
  KE: 'sw', // Kenya
  TZ: 'sw', // Tanzania
  ZA: 'zu', // South Africa (Zulu is one of 11 official languages)
  ZA_XH: 'xh', // South Africa (Xhosa regions)
  NG_IG: 'ig', // Nigeria (Igbo regions)
  NG_YO: 'yo', // Nigeria (Yoruba regions)
  GH: 'ak', // Ghana (Akan/Ashanti)
};

export function detectLanguageFromIp(ip: string): string | null {
  // For local development
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return null;
  }
  
  const geo = geoip.lookup(ip);
  
  if (!geo) {
    return null;
  }
  
  // Special case for South Africa to handle multiple languages
  if (geo.country === 'ZA') {
    // This would need to be refined with more specific region detection
    // For now, we're defaulting to Zulu for South Africa
    return 'zu';
  }
  
  // Special case for Nigeria to handle multiple languages
  if (geo.country === 'NG') {
    // This would need to be refined with more specific region detection
    // For now, we're defaulting to Yoruba for Nigeria
    return 'yo';
  }
  
  return countryLanguageMap[geo.country] || null;
}

export function getSuggestedLanguage(req: any): string | null {
  // Get the client's IP address
  const ip = req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             (req.connection.socket ? req.connection.socket.remoteAddress : null);
             
  if (!ip) {
    return null;
  }
  
  return detectLanguageFromIp(String(ip));
}
