import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

// Language options with their native names
const languages = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' }, // Chinese
  { code: 'tr', name: 'Türkçe' }, // Turkish
  { code: 'ru', name: 'Русский' }, // Russian
  { code: 'pt', name: 'Português' }, // Portuguese
  { code: 'pt-br', name: 'Português (Brasil)' }, // Brazilian Portuguese
  { code: 'es', name: 'Español' }, // Spanish
  { code: 'es-ar', name: 'Español (Latinoamérica)' }, // South American Spanish
  { code: 'fr', name: 'Français' }, // French
  { code: 'de', name: 'Deutsch' }, // German
  { code: 'nl', name: 'Nederlands' }, // Dutch
  { code: 'it', name: 'Italiano' }, // Italian
  { code: 'pl', name: 'Polski' }, // Polish
  { code: 'sw', name: 'Kiswahili' }, // Swahili
  { code: 'xh', name: 'isiXhosa' }, // Xhosa
  { code: 'zu', name: 'isiZulu' }, // Zulu
  { code: 'ig', name: 'Igbo' }, // Igbo
  { code: 'yo', name: 'Yorùbá' }, // Yoruba
  { code: 'ak', name: 'Twi' }, // Ashanti/Twi
  { code: 'ar', name: 'العربية' }, // Arabic
  { code: 'he', name: 'עברית' }, // Hebrew
  { code: 'fa', name: 'فارسی' }, // Farsi
  { code: 'sv', name: 'Svenska' }, // Swedish
  { code: 'fi', name: 'Suomi' }, // Finnish
  { code: 'da', name: 'Dansk' }, // Danish
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setCurrentLanguage(lng);
    // Save to localStorage
    localStorage.setItem('i18nLng', lng);
  };

  const getCurrentLanguageName = () => {
    const lang = languages.find(lang => lang.code === currentLanguage);
    return lang ? lang.name : 'English';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          <Globe className="h-4 w-4" />
          <span>{getCurrentLanguageName()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={currentLanguage === lang.code ? "bg-secondary" : ""}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
