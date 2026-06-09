import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language } from '../i18n/types';
import { vi } from '../i18n/dictionaries/vi';
import { en } from '../i18n/dictionaries/en';

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const dictionaries = { vi, en };

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'vi',
      setLanguage: (lang: Language) => set({ language: lang }),
      t: (key: string) => {
        const lang = get().language;
        return dictionaries[lang][key] || key;
      }
    }),
    {
      name: 'garden-house-3d-i18n'
    }
  )
);
