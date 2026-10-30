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

  if (env.SEED_DEMO_ACCOUNTS === 'true') await ensureDemoAccounts();
}

/**
 * Sample Admin, Teacher and Student for trying the platform. Their passwords are public (they are in the
 * repository), so anyone can sign in as them: this is off unless SEED_DEMO_ACCOUNTS=true, and the
 * sample accounts should be deactivated or the flag removed before real data is entered.
 */
async function ensureDemoAccounts(): Promise<void> {
  const demo = [
    { email: 'admin@eotc-andnet.org', password: 'AdminSecurePassword2026!', fullName: 'ሊቀ ጉባኤ Admin', role: 'ADMIN' as const },
    { email: 'teacher@eotc-andnet.org', password: 'TeacherPassword2026!', fullName: 'መምህር ሚካኤል (Teacher Michael)', role: 'TEACHER' as const },
    { email: 'student@eotc-andnet.org', password: 'StudentPassword2026!', fullName: 'ዮሐንስ ዳዊት (Yohannes Dawit)', role: 'STUDENT' as const },
  ];
  const grade1 = await prisma.grade.findUnique({ where: { level: 1 } });
  for (const d of demo) {
    if (await prisma.user.findUnique({ where: { email: d.email } })) continue;
    await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await bcrypt.hash(d.password, 12),
        fullName: d.fullName,
        role: d.role,
        isActive: true,
        ...(d.role === 'STUDENT' && grade1 ? { enrolledGrades: { create: [{ gradeId: grade1.id }] } } : {}),
      },
    });
    console.log('Demo account created:', d.email);
  }
}
