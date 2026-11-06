'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SignInSplash, useTelegram } from '@/lib/telegram-context';
import { useLanguage } from '@/lib/language-context';

/**
 * Telegram Mini App entry point (the URL configured in @BotFather). TelegramProvider signs the student in
 * before this page renders; it only decides where to go next.
 */
export default function TelegramEntryPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { status, launch } = useTelegram();

  // Fetch the lessons page while signing in, so the hand-over is instant
  useEffect(() => {
    router.prefetch('/');
    router.prefetch('/profile');
  }, [router]);

  useEffect(() => {
    if (status !== 'ready' && status !== 'web') return;
    // A brand-new student first completes their profile; everyone else goes to their lessons
    router.replace(launch?.isNewUser ? '/profile?welcome=1' : '/');
  }, [status, launch, router]);

  // Same screen as the sign-in splash, so there is no flash between signing in and the lessons page
  return <SignInSplash pick={(am, en) => (lang === 'am' ? am : en)} />;
}
