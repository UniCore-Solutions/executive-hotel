/** Static content: UI strings per language — port of RC.t dictionaries (common.js). */
import type { LangCode } from '@/types';

export const LANGS: Array<{ code: LangCode; label: string; native: string }> = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'Français', native: 'Français' },
  { code: 'ar', label: 'العربية', native: 'العربية' },
];

export const DICT: Record<LangCode, Record<string, string>> = {
  en: {
    bookNow: 'Book now',
    searchRooms: 'Search rooms',
    search: 'Search',
    dates: 'Dates',
    guests: 'Guests',
    promo: 'Promo code',
    rooms: 'Rooms',
    offers: 'Offers',
    experiences: 'Experiences',
    reviews: 'Reviews',
    faq: 'FAQ',
    myReservation: 'My reservation',
    contact: 'Contact',
    language: 'Language',
    currency: 'Currency',
  },
  fr: {
    bookNow: 'Réserver',
    searchRooms: 'Voir les chambres',
    search: 'Rechercher',
    dates: 'Dates',
    guests: 'Voyageurs',
    promo: 'Code promo',
    rooms: 'Chambres',
    offers: 'Offres',
    experiences: 'Expériences',
    reviews: 'Avis',
    faq: 'FAQ',
    myReservation: 'Ma réservation',
    contact: 'Contact',
    language: 'Langue',
    currency: 'Devise',
  },
  ar: {
    bookNow: 'احجز الآن',
    searchRooms: 'ابحث عن الغرف',
    search: 'بحث',
    dates: 'التواريخ',
    guests: 'النزلاء',
    promo: 'رمز ترويجي',
    rooms: 'الغرف',
    offers: 'العروض',
    experiences: 'التجارب',
    reviews: 'التقييمات',
    faq: 'الأسئلة',
    myReservation: 'حجزي',
    contact: 'اتصل بنا',
    language: 'اللغة',
    currency: 'العملة',
  },
};

export function translate(lang: LangCode, key: string): string {
  return (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
}
