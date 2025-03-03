import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supportedLanguages } from "../i18n";
import { Globe } from "lucide-react";

interface LanguagePromptProps {
  suggestedLang: string;
  onAccept: () => void;
  onDecline: () => void;
}

type SupportedLanguageCode = keyof typeof supportedLanguages;

const LanguagePrompt = ({ suggestedLang, onAccept, onDecline }: LanguagePromptProps) => {
  const { t } = useTranslation();
  const nativeName = supportedLanguages[suggestedLang as SupportedLanguageCode]?.nativeName || suggestedLang;

  return (
    <div className="fixed bottom-4 right-4 bg-card p-4 rounded-lg shadow-md max-w-sm z-50 border">
      <p className="mb-3">{t('language.detectedPrompt', { language: nativeName })}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept}>{t('language.switchTo', { language: nativeName })}</Button>
        <Button size="sm" variant="outline" onClick={onDecline}>{t('language.stayInEnglish')}</Button>
      </div>
    </div>
  );
};

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [suggestedLang, setSuggestedLang] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have saved the user's preference not to show the prompt
    const promptDismissed = localStorage.getItem("languagePromptDismissed");

    if (promptDismissed === "true") {
      return;
    }

    // Get the suggested language from the server
    const checkLanguageSuggestion = async () => {
      try {
        const response = await fetch("/api/language-suggestion");
        if (response.ok) {
          const { suggestedLanguage } = await response.json();

          // Only show prompt if the suggested language is different from current
          if (
            suggestedLanguage && 
            suggestedLanguage !== i18n.language && 
            Object.keys(supportedLanguages).includes(suggestedLanguage)
          ) {
            setSuggestedLang(suggestedLanguage);
            setShowPrompt(true);
          }
        }
      } catch (error) {
        console.error("Failed to get language suggestion:", error);
      }
    };

    checkLanguageSuggestion();
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const acceptSuggestion = () => {
    if (suggestedLang) {
      changeLanguage(suggestedLang);
    }
    setShowPrompt(false);
  };

  const declineSuggestion = () => {
    localStorage.setItem("languagePromptDismissed", "true");
    setShowPrompt(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('language.selector')}>
            <Globe className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {Object.entries(supportedLanguages).map(([code, { nativeName }]) => (
            <DropdownMenuItem
              key={code}
              onClick={() => changeLanguage(code)}
              className={i18n.language === code ? "bg-accent font-semibold" : ""}
            >
              {nativeName}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {showPrompt && suggestedLang && (
        <LanguagePrompt
          suggestedLang={suggestedLang}
          onAccept={acceptSuggestion}
          onDecline={declineSuggestion}
        />
      )}
    </>
  );
}