import { ApiError } from '@/lib/api';

type Lang = 'am' | 'en';

/** Turns any sign-in / registration error into a clear, bilingual message for the user. */
export function friendlyAuthError(err: unknown, lang: Lang, fallbackEn = 'Something went wrong. Please try again.'): string {
  const t = (en: string, am: string) => (lang === 'am' ? am : en);

  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NETWORK_ERROR':
        return t(
          'Cannot reach the server. Check your internet connection and try again.',
          'አገልጋዩን ማግኘት አልተቻለም። የኢንተርኔት ግንኙነትዎን ያረጋግጡና እንደገና ይሞክሩ።'
        );
      case 'SERVER_UNAVAILABLE':
        return t(
          'The server is starting up or temporarily unavailable. Please wait about 30 seconds and try again.',
          'አገልጋዩ እየተነሳ ነው ወይም ለጊዜው አይገኝም። ወደ 30 ሰከንድ ቆይተው እንደገና ይሞክሩ።'
        );
      case 'INVALID_CREDENTIALS':
        return t('Incorrect email/username or password.', 'የተሳሳተ ኢሜይል/የተጠቃሚ ስም ወይም የይለፍ ቃል።');
      case 'ACCOUNT_INACTIVE':
        return t('This account is deactivated. Please contact an administrator.', 'ይህ መለያ ታግዷል። እባክዎ አስተዳዳሪን ያነጋግሩ።');
      case 'EMAIL_EXISTS':
        return t('An account with this email already exists. Try signing in instead.', 'በዚህ ኢሜይል መለያ አለ። በምትኩ ለመግባት ይሞክሩ።');
      case 'USERNAME_EXISTS':
        return t('This username is already taken. Please choose another one.', 'ይህ የተጠቃሚ ስም ተወስዷል። ሌላ ይምረጡ።');
      case 'IDENTIFIER_REQUIRED':
        return t('Enter an email address or choose a username.', 'ኢሜይል ያስገቡ ወይም የተጠቃሚ ስም ይምረጡ።');
      default:
        return (lang === 'am' && err.amharicMessage) || err.message || t(fallbackEn, 'ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።');
    }
  }
  return err instanceof Error && err.message ? err.message : t(fallbackEn, 'ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።');
}
