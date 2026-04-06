import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (bn: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'bn';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    
    const changeGoogleTranslate = () => {
      const select = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (select) {
        if (language === 'en') {
          // Try to set to English if available
          select.value = 'en';
          select.dispatchEvent(new Event('change'));
          
          // Try to click the "Show original" button in the Google Translate iframe
          try {
            const iframe = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement;
            if (iframe && iframe.contentWindow) {
              const innerDoc = iframe.contentWindow.document;
              // The restore button usually has id ':1.restore' or is inside a specific class
              const restoreBtnById = innerDoc.getElementById(':1.restore') as HTMLButtonElement;
              const restoreBtnByClass = innerDoc.querySelector('.goog-te-button button') as HTMLButtonElement;
              
              if (restoreBtnById) {
                restoreBtnById.click();
              } else if (restoreBtnByClass) {
                restoreBtnByClass.click();
              }
            }
          } catch (e) {
            // Ignore CORS or other errors
          }

          // We can also try to remove the googtrans cookie as a fallback
          document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + location.hostname + "; path=/;";
        } else {
          select.value = language;
          select.dispatchEvent(new Event('change'));
        }
      }
    };

    // Try to change immediately, and also after short delays in case Google Translate is still loading
    changeGoogleTranslate();
    setTimeout(changeGoogleTranslate, 500);
    setTimeout(changeGoogleTranslate, 1000);
    setTimeout(changeGoogleTranslate, 2000);
  }, [language]);

  const t = (bn: string, en: string) => {
    return language === 'bn' ? bn : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
