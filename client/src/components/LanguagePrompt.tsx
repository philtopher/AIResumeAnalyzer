import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export default function LanguagePrompt() {
  const { i18n, t } = useTranslation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [suggestedLanguage, setSuggestedLanguage] = useState<string | null>(null);
  const [suggestedLanguageName, setSuggestedLanguageName] = useState<string>('');
  const { toast } = useToast();

  // Language name mapping (same as in LanguageSwitcher)
  const languageNames: Record<string, string> = {
    'en': 'English',
    'zh': '中文', // Chinese
    'tr': 'Türkçe', // Turkish
    'ru': 'Русский', // Russian
    'pt': 'Português', // Portuguese
    'pt-br': 'Português (Brasil)', // Brazilian Portuguese
    'es': 'Español', // Spanish
    'es-ar': 'Español (Latinoamérica)', // South American Spanish
    'fr': 'Français', // French
    'de': 'Deutsch', // German
    'nl': 'Nederlands', // Dutch
    'it': 'Italiano', // Italian
    'pl': 'Polski', // Polish
    'sw': 'Kiswahili', // Swahili
    'xh': 'isiXhosa', // Xhosa
    'zu': 'isiZulu', // Zulu
    'ig': 'Igbo', // Igbo
    'yo': 'Yorùbá', // Yoruba
    'ak': 'Twi', // Ashanti/Twi
    'ar': 'العربية', // Arabic
    'he': 'עברית', // Hebrew
    'fa': 'فارسی', // Farsi
    'sv': 'Svenska', // Swedish
    'fi': 'Suomi', // Finnish
    'da': 'Dansk', // Danish
  };

  // Check if we've already prompted this user before
  const hasPromptedBefore = () => {
    return localStorage.getItem('languagePromptShown') === 'true';
  };

  // Mark that we've prompted the user
  const markPromptShown = () => {
    localStorage.setItem('languagePromptShown', 'true');
  };

  useEffect(() => {
    const detectLanguage = async () => {
      try {
        // Skip if we've already prompted before or if user has explicitly set language
        if (hasPromptedBefore() || localStorage.getItem('i18nLng')) {
          return;
        }

        const response = await fetch('/api/detect-language');
        const data = await response.json();
        
        if (data.suggestedLanguage && data.suggestedLanguage !== i18n.language) {
          setSuggestedLanguage(data.suggestedLanguage);
          setSuggestedLanguageName(languageNames[data.suggestedLanguage] || data.suggestedLanguage);
          setShowPrompt(true);
        }
      } catch (error) {
        console.error('Error detecting language:', error);
      }
    };

    // Detect language after a short delay
    const timer = setTimeout(() => {
      detectLanguage();
    }, 2000);

    return () => clearTimeout(timer);
  }, [i18n.language]);

  // Switch to suggested language
  const switchLanguage = () => {
    if (suggestedLanguage) {
      i18n.changeLanguage(suggestedLanguage);
      localStorage.setItem('i18nLng', suggestedLanguage);
      setShowPrompt(false);
      markPromptShown();
      
      toast({
        title: t('Language Changed'),
        description: t('The interface language has been changed to {{language}}', { language: suggestedLanguageName }),
      });
    }
  };

  // Dismiss the prompt
  const dismissPrompt = () => {
    setShowPrompt(false);
    markPromptShown();
  };

  if (!showPrompt) return null;

  return (
    <ToastProvider>
      <Toast open={showPrompt} onOpenChange={setShowPrompt}>
        <div className="flex">
          <div className="flex-1">
            <ToastTitle>{t('Language Suggestion')}</ToastTitle>
            <ToastDescription>
              {t('Would you like to switch to {{language}}?', { language: suggestedLanguageName })}
            </ToastDescription>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={switchLanguage}
              className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('Yes')}
            </button>
            <button 
              onClick={dismissPrompt}
              className="rounded bg-secondary px-3 py-1 text-xs font-medium hover:bg-secondary/90"
            >
              {t('No')}
            </button>
          </div>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
