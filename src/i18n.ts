import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'
import zhTW from './locales/zh-TW.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import de from './locales/de.json'
import fr from './locales/fr.json'
import es from './locales/es.json'
import ptBR from './locales/pt-BR.json'
import ru from './locales/ru.json'
import it from './locales/it.json'

// 默认中文（项目核心诉求：对中文用户友好）
i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    ja: { translation: ja },
    ko: { translation: ko },
    de: { translation: de },
    fr: { translation: fr },
    es: { translation: es },
    'pt-BR': { translation: ptBR },
    ru: { translation: ru },
    it: { translation: it },
  },
  lng: 'zh-CN',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
