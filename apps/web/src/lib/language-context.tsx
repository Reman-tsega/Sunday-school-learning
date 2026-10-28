'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'am' | 'en';

export interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, defaultAmharic?: string, defaultEnglish?: string) => string;
  pick: <T = string>(amharicVal?: T | null, englishVal?: T | null) => T | string;
}

const translations: Record<string, { am: string; en: string }> = {
  // Navigation & Brand
  'brand.title': { am: 'የሰንበት ት/ቤት አንድነት', en: 'EOTC Sunday School Platform' },
  'brand.subtitle': { am: 'ኦርቶዶክሳዊ የመማሪያ መድረክ', en: 'Orthodox Learning Platform' },
  'nav.admin': { am: 'አስተዳዳሪ', en: 'Admin Portal' },
  'nav.downloads': { am: 'የወረዱ መጻሕፍት', en: 'Downloaded Books' },
  'nav.signIn': { am: 'ግባ', en: 'Sign In' },
  'nav.signOut': { am: 'ውጣ', en: 'Sign Out' },
  'nav.online': { am: 'መስመር ላይ', en: 'Online' },
  'nav.offline': { am: 'ከመስመር ውጭ', en: 'Offline' },
  'nav.synced': { am: 'ተመሳስሏል', en: 'Synced' },
  'nav.syncing': { am: 'በማመሳሰል ላይ...', en: 'Syncing...' },
  'nav.unsynced': { am: 'ያልተመሳሰሉ', en: 'Unsynced' },

  // Admin Shell & Navigation
  'admin.portal': { am: 'አስተዳዳሪ ፖርታል', en: 'Admin Portal' },
  'admin.subtitle': { am: 'የቁጥጥር ስቱዲዮ', en: 'Admin Control Studio' },
  'admin.dashboard': { am: 'አጠቃላይ እይታ', en: 'Dashboard' },
  'admin.users': { am: 'ተጠቃሚዎች', en: 'Users' },
  'admin.curriculum': { am: 'ስርዓተ ትምህርት', en: 'Curriculum' },
  'admin.backToStudent': { am: 'ወደ ተማሪዎች ገጽ ተመለስ', en: 'Back to Student View' },
  'admin.accessDenied': { am: 'ይቅርታ፣ ፈቃድ የለዎትም', en: 'Access Denied' },
  'admin.accessDeniedDesc': {
    am: 'ይህ ገጽ ለአስተዳዳሪዎች ብቻ የተፈቀደ ነው። እባክዎ በአስተዳዳሪ አካውንት ይግቡ።',
    en: 'This page is restricted to administrators. Please sign in with an admin account.',
  },

  // Actions & Buttons
  'btn.addGrade': { am: 'አዲስ ክፍል ጨምር', en: 'Add Grade' },
  'btn.addSubject': { am: 'አዲስ የትምህርት ዓይነት ጨምር', en: 'Add Subject' },
  'btn.addChapter': { am: 'ምዕራፍ ጨምር', en: 'Add Chapter' },
  'btn.addQuestion': { am: 'ጥያቄ ጨምር', en: 'Add Question' },
  'btn.addReference': { am: 'መረጃ አያይዝ', en: 'Add Reference' },
  'btn.addUser': { am: 'አዲስ ተጠቃሚ መዝግብ', en: 'Add User' },
  'btn.save': { am: 'አስቀምጥ', en: 'Save' },
  'btn.cancel': { am: 'ሰርዝ', en: 'Cancel' },
  'btn.delete': { am: 'ሰርዝ', en: 'Delete' },
  'btn.create': { am: 'ፍጠር', en: 'Create' },
  'btn.close': { am: 'ዝጋ', en: 'Close' },
  'btn.study': { am: 'ተማር', en: 'Study' },
  'btn.quiz': { am: 'ፈተና', en: 'Practice Quiz' },
  'btn.download': { am: 'አውርድ', en: 'Download' },
  'btn.downloadOffline': { am: 'ከመስመር ውጭ አውርድ', en: 'Download Offline' },
  'btn.readyOffline': { am: 'ዝግጁ', en: 'Ready Offline' },
  'btn.publish': { am: 'ይዘቱን አትም', en: 'Publish Package' },
  'btn.republish': { am: 'እንደገና አትም', en: 'Re-Publish' },
  'btn.unpublish': { am: 'አታሳትም', en: 'Unpublish' },
  'btn.editStudio': { am: 'ይዘት አዘጋጅ', en: 'Studio' },
  'btn.retakeQuiz': { am: 'እንደገና ይፈትኑ', en: 'Retake Quiz' },
  'btn.submitAnswers': { am: 'መልሶችን አስረክብ', en: 'Submit Answers' },
  'btn.backToCurriculum': { am: 'ወደ ማውጫ ተመለስ', en: 'Back to Curriculum' },
  'btn.all': { am: 'ሁሉም', en: 'All' },
  'btn.allGrades': { am: 'ሁሉም ክፍሎች', en: 'All Grades' },

  // Status Badges
  'status.published': { am: 'የታተመ', en: 'Published' },
  'status.draft': { am: 'ረቂቅ', en: 'Draft' },
  'status.availableOffline': { am: 'ከመስመር ውጭ ይገኛል', en: 'Available Offline' },
  'status.downloading': { am: 'በማውረድ ላይ...', en: 'Downloading...' },
  'status.incomplete': { am: 'ያልተሟላ', en: 'Incomplete' },
  'status.notDownloaded': { am: 'አልወረደም', en: 'Not Downloaded' },
  'status.ready': { am: 'ዝግጁ ነው', en: 'Ready' },
  'status.active': { am: 'ንቁ', en: 'Active' },
  'status.inactive': { am: 'የታገደ', en: 'Inactive' },
  'status.activate': { am: 'አንቃ', en: 'Activate' },
  'status.deactivate': { am: 'አግድ', en: 'Deactivate' },

  // Chips
  'chip.noPdf': { am: 'PDF የለም', en: 'No PDF' },
  'chip.noQuiz': { am: 'ፈተና የለም', en: 'No Quiz' },
  'chip.questions': { am: 'ጥያቄዎች', en: 'Questions' },
  'chip.references': { am: 'ማጣቀሻዎች', en: 'References' },
  'chip.subjects': { am: 'የትምህርት ዓይነቶች', en: 'Subjects' },
  'chip.chapters': { am: 'ምዕራፎች', en: 'Chapters' },

  // Common Headers
  'header.curriculum': { am: 'ስርዓተ ትምህርት አስተዳደር', en: 'Curriculum Management' },
  'header.curriculumSubtitle': {
    am: 'ክፍሎችን፣ የትምህርት ዓይነቶችንና ምዕራፎችን ማደራጀት፣ የመማሪያ ፓኬጆችን ማዘጋጀት',
    en: 'Organize grades, subjects, and chapters, and prepare offline learning packages',
  },
  'header.userManagement': { am: 'የተጠቃሚዎች አስተዳደር', en: 'User Management' },
  'header.userSubtitle': {
    am: 'የተማሪዎች፣ መምህራን እና የአስተዳዳሪ አካውንቶችን መፍጠር፣ መቆጣጠር እና ማስተካከል',
    en: 'Create, monitor, and manage student, teacher, and administrator accounts',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'am',
  setLang: () => {},
  toggleLang: () => {},
  t: (key, amFallback, _enFallback) => amFallback || key,
  pick: (amVal, enVal) => (amVal !== undefined && amVal !== null && amVal !== '' ? (amVal as any) : (enVal as any)),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('am');

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('eotc_lang') as Language;
      if (savedLang === 'am' || savedLang === 'en') {
        setLangState(savedLang);
      }
    } catch {
      // Ignore localStorage access failures
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('eotc_lang', newLang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLang;
      }
    } catch {
      // Ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === 'am' ? 'en' : 'am');
  };

  const t = (key: string, defaultAmharic?: string, defaultEnglish?: string): string => {
    const entry = translations[key];
    if (entry) {
      return lang === 'am' ? entry.am : entry.en;
    }
    if (lang === 'am') {
      return defaultAmharic ?? defaultEnglish ?? key;
    }
    return defaultEnglish ?? defaultAmharic ?? key;
  };

  const pick = <T = string>(amharicVal?: T | null, englishVal?: T | null): T | string => {
    if (lang === 'am') {
      if (amharicVal !== undefined && amharicVal !== null && amharicVal !== '') {
        return amharicVal;
      }
      return englishVal ?? '';
    } else {
      if (englishVal !== undefined && englishVal !== null && englishVal !== '') {
        return englishVal;
      }
      return amharicVal ?? '';
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, pick }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
