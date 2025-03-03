import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Languages supported by the application
export const supportedLanguages = {
  en: { nativeName: 'English' },
  zh: { nativeName: '中文' },      // Chinese
  tr: { nativeName: 'Türkçe' },    // Turkish
  ru: { nativeName: 'Русский' },   // Russian
  pt: { nativeName: 'Português' }, // Portuguese
  es: { nativeName: 'Español' },   // Spanish
  fr: { nativeName: 'Français' },  // French
  de: { nativeName: 'Deutsch' },   // German
  nl: { nativeName: 'Nederlands' }, // Dutch
  it: { nativeName: 'Italiano' },  // Italian
  pl: { nativeName: 'Polski' },    // Polish
  sw: { nativeName: 'Kiswahili' }, // Swahili
  xh: { nativeName: 'isiXhosa' },  // Xhosa
  zu: { nativeName: 'isiZulu' },   // Zulu
  ig: { nativeName: 'Igbo' },      // Igbo
  yo: { nativeName: 'Yorùbá' },    // Yoruba
  ak: { nativeName: 'Akan' },      // Ashanti/Akan
  ar: { nativeName: 'العربية' },   // Arabic
  he: { nativeName: 'עברית' },     // Hebrew
  fa: { nativeName: 'فارسی' },     // Farsi
};

i18n
  // Load translation files from /public/locales/{language}/translation.json
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    debug: import.meta.env.DEV,
    fallbackLng: 'en',
    supportedLngs: Object.keys(supportedLanguages),
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage'],
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
