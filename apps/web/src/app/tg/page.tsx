'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTelegram } from '@/lib/telegram-context';

/**
 * Telegram Mini App entry point (the URL configured in @BotFather). TelegramProvider signs the student in
 * before this page renders; it only decides where to go next.
 */
export default function TelegramEntryPage() {
  const router = useRouter();
  const { status, launch } = useTelegram();

  useEffect(() => {
    if (status !== 'ready' && status !== 'web') return;
    // A brand-new student first completes their profile; everyone else goes to their lessons
    router.replace(launch?.isNewUser ? '/profile?welcome=1' : '/');
  }, [status, launch, router]);

  return (
    <div className="flex justify-center py-24">
      <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
    </div>
  );
}
