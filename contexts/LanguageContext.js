//context/LanguageContext.js
"use client";
import { createContext, useContext, useState } from "react";
import { translate, getIslandName, getAvailableLanguages } from "./translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState("hr"); // Default to Croatian

  // Get available languages from translations
  const availableLanguages = getAvailableLanguages();

  // Get flag emoji for language code
  const getFlagEmoji = (langCode) => {
    const countryCodes = {
      hr: "HR", en: "GB", de: "DE", it: "IT", fr: "FR",
      es: "ES", ru: "RU", zh: "CN", ja: "JP", ar: "SA",
      pt: "PT", nl: "NL", sv: "SE", fi: "FI", da: "DK",
      no: "NO", pl: "PL", cs: "CZ", hu: "HU", ro: "RO",
      el: "GR", tr: "TR", he: "IL", hi: "IN", ko: "KR",
      th: "TH", vi: "VN", id: "ID", ms: "MY", fil: "PH",
      uk: "UA", sk: "SK", sl: "SI", bg: "BG", sr: "RS",
      lt: "LT", lv: "LV", et: "EE"
    };
    
    const code = countryCodes[langCode] || "UN";
    try {
      return code
        .split("")
        .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join("");
    } catch (error) {
      return "🌍";
    }
  };

  const value = {
    currentLanguage,
    availableLanguages,
    changeLanguage: setCurrentLanguage,
    translate: (key, replacements) => translate(key, currentLanguage, replacements),
    getIslandName: (islandName) => getIslandName(islandName, currentLanguage),
    getFlagEmoji,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
