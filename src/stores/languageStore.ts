import { create } from 'zustand'
import i18n from '@/i18n/config'

export type Language = 'zh-TW' | 'en'

interface LanguageStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: (localStorage.getItem('language') as Language) || 'zh-TW',

  setLanguage: (lang) => {
    set({ language: lang })
    localStorage.setItem('language', lang)
    i18n.changeLanguage(lang)
  },
}))
