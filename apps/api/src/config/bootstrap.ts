import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { env } from './env.js';

const DEFAULT_GRADES = [
  { level: 1, name: 'Grade 1', amharicName: 'ክፍል ፩ (Grade 1)', description: 'የመጀመሪያ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 1 },
  { level: 2, name: 'Grade 2', amharicName: 'ክፍል ፪ (Grade 2)', description: 'ሁለተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 2 },
  { level: 3, name: 'Grade 3', amharicName: 'ክፍል ፫ (Grade 3)', description: 'ሦስተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 3 },
  { level: 4, name: 'Grade 4', amharicName: 'ክፍል ፬ (Grade 4)', description: 'አራተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 4 },
];

/**
 * First-run setup for a fresh production database (no shell access needed):
 * creates the initial administrator from INITIAL_ADMIN_* when no admin exists,
 * and the base grades when there are none. Safe to run on every start.
 */
export async function bootstrapFirstRun(): Promise<void> {
  if (env.NODE_ENV === 'test') return;

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    const email = env.INITIAL_ADMIN_EMAIL.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN', isActive: true } });
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, 12),
          fullName: env.INITIAL_ADMIN_NAME,
          role: 'ADMIN',
          isActive: true,
        },
      });
    }
    console.log(`Initial administrator ready: ${email}`);
  }

  if ((await prisma.grade.count()) === 0) {
    await prisma.grade.createMany({ data: DEFAULT_GRADES });
    console.log('Base grades 1-4 created.');
  }
}
