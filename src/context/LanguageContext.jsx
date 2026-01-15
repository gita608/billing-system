import React, { createContext, useContext, useState, useEffect } from 'react';

// Import translations
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const translations = { en, ar };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isRTL, setIsRTL] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  // Update document direction when language changes
  useEffect(() => {
    const rtl = language === 'ar';
    setIsRTL(rtl);
    document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    document.body.style.direction = rtl ? 'rtl' : 'ltr';
  }, [language]);

  const loadSavedLanguage = async () => {
    try {
      // Try to get from electron settings first
      if (window.electronAPI) {
        const result = await window.electronAPI.getSettings();
        if (result.success && result.data.language) {
          setLanguage(result.data.language);
          return;
        }
      }
      // Fallback to localStorage
      const saved = localStorage.getItem('language');
      if (saved && translations[saved]) {
        setLanguage(saved);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const changeLanguage = async (lang) => {
    if (!translations[lang]) {
      console.error('Language not supported:', lang);
      return;
    }
    
    setLanguage(lang);
    localStorage.setItem('language', lang);
    
    // Save to electron settings
    if (window.electronAPI) {
      try {
        await window.electronAPI.updateSetting('language', lang);
      } catch (error) {
        console.error('Error saving language setting:', error);
      }
    }
  };

  // Translation function
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations['en'];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if translation not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const value = {
    language,
    setLanguage: changeLanguage,
    isRTL,
    t,
    availableLanguages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    ],
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
