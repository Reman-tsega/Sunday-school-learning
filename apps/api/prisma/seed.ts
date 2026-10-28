import { PrismaClient, Role, PackageStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface ChapterSeedConfig {
  gradeLevel: number;
  gradeName: string;
  gradeAmharicName: string;
  subjectCode: string;
  subjectName: string;
  subjectAmharicName: string;
  subjectDescription: string;
  subjectOrder: number;
  chapterNumber: number;
  chapterTitle: string;
  chapterAmharicTitle: string;
  chapterDescription: string;
  chapterOrder: number;
  textbookTitle: string;
  startPage: number;
  endPage: number;
  totalPages: number;
  fileUrl: string;
  quizTitle: string;
  quizAmharicTitle: string;
  questionPrompt: string;
  questionAmharicPrompt: string;
  choices: Array<{ text: string; amharicText: string; isCorrect: boolean; orderIndex: number }>;
  explanation: string;
  amharicExplanation: string;
  refTitle: string;
  refAmharicTitle: string;
  refDocUrl: string;
  webUrl: string;
}

async function seedCompleteChapter(cfg: ChapterSeedConfig, gradeId: string) {
  // 1. Upsert Subject
  const subject = await prisma.subject.upsert({
    where: {
      gradeId_code: {
        gradeId,
        code: cfg.subjectCode,
      },
    },
    update: {},
    create: {
      gradeId,
      name: cfg.subjectName,
      amharicName: cfg.subjectAmharicName,
      code: cfg.subjectCode,
      description: cfg.subjectDescription,
      orderIndex: cfg.subjectOrder,
    },
  });

  // 2. Upsert Chapter
  const chapter = await prisma.chapter.upsert({
    where: {
      subjectId_chapterNumber: {
        subjectId: subject.id,
        chapterNumber: cfg.chapterNumber,
      },
    },
    update: {
      isPublished: true,
      title: cfg.chapterTitle,
      amharicTitle: cfg.chapterAmharicTitle,
      description: cfg.chapterDescription,
    },
    create: {
      subjectId: subject.id,
      chapterNumber: cfg.chapterNumber,
      title: cfg.chapterTitle,
      amharicTitle: cfg.chapterAmharicTitle,
      description: cfg.chapterDescription,
      orderIndex: cfg.chapterOrder,
      isPublished: true,
      version: 1,
    },
  });

  // 3. Upsert Textbook Document
  const textbookChecksum = crypto
    .createHash('sha256')
    .update(`textbook-${cfg.subjectCode}-ch${cfg.chapterNumber}-v1`)
    .digest('hex');
  const textbookSize = 2500000 + cfg.chapterNumber * 200000;

  const textbook = await prisma.textbookDocument.upsert({
    where: { chapterId: chapter.id },
    update: {
      title: cfg.textbookTitle,
      startPage: cfg.startPage,
      endPage: cfg.endPage,
      totalPages: cfg.totalPages,
    },
    create: {
      chapterId: chapter.id,
      title: cfg.textbookTitle,
      fileUrl: cfg.fileUrl,
      fileKey: `textbooks/${cfg.subjectCode.toLowerCase()}-ch${cfg.chapterNumber}.pdf`,
      fileSize: textbookSize,
      checksumSha256: textbookChecksum,
      mimeType: 'application/pdf',
      startPage: cfg.startPage,
      endPage: cfg.endPage,
      totalPages: cfg.totalPages,
    },
  });

  // 4. Create Quiz & Questions if not existing
  let quiz = await prisma.quiz.findFirst({
    where: { chapterId: chapter.id },
    include: {
      questions: {
        include: { choices: true },
      },
    },
  });

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        chapterId: chapter.id,
        title: cfg.quizTitle,
        amharicTitle: cfg.quizAmharicTitle,
        description: `Practice quiz for ${cfg.chapterTitle}`,
        timeLimitMinutes: 15,
        passingScore: 70,
        isPractice: true,
        version: 1,
        isPublished: true,
        questions: {
          create: [
            {
              prompt: cfg.questionPrompt,
              amharicPrompt: cfg.questionAmharicPrompt,
              points: 10,
              orderIndex: 1,
              explanation: cfg.explanation,
              amharicExplanation: cfg.amharicExplanation,
              choices: {
                create: cfg.choices,
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: { choices: true },
        },
      },
    });
  }

  // 5. Create References
  const refDocChecksum = crypto
    .createHash('sha256')
    .update(`ref-${cfg.subjectCode}-ch${cfg.chapterNumber}`)
    .digest('hex');
  const refSize = 165000;

  const existingRefs = await prisma.referenceLink.count({ where: { chapterId: chapter.id } });
  if (existingRefs === 0) {
    await prisma.referenceLink.createMany({
      data: [
        {
          chapterId: chapter.id,
          title: cfg.refTitle,
          amharicTitle: cfg.refAmharicTitle,
          url: cfg.refDocUrl,
          isDownloadable: true,
          downloadableDocUrl: cfg.refDocUrl,
          downloadableDocSize: refSize,
          downloadableDocChecksum: refDocChecksum,
          orderIndex: 1,
        },
        {
          chapterId: chapter.id,
          title: 'EOTC Sunday Schools Patriarchate Portal',
          amharicTitle: 'የሰንበት ትምህርት ቤቶች አንድነት ድረ-ገጽ',
          url: cfg.webUrl,
          isDownloadable: false,
          orderIndex: 2,
        },
      ],
    });
  }

  // 6. Build Manifest & Create Learning Package
  const totalSizeBytes = textbookSize + refSize;
  const manifestData = {
    packageId: `pkg-${chapter.id}-v1`,
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    chapterTitle: chapter.title,
    amharicChapterTitle: chapter.amharicTitle,
    subjectId: subject.id,
    subjectName: subject.name,
    amharicSubjectName: subject.amharicName,
    gradeLevel: cfg.gradeLevel,
    gradeName: cfg.gradeName,
    version: 1,
    publishedAt: new Date().toISOString(),
    checksumSha256: textbookChecksum,
    totalSizeBytes,
    textbook: {
      id: textbook.id,
      title: textbook.title,
      fileUrl: textbook.fileUrl,
      fileSize: textbook.fileSize,
      checksumSha256: textbook.checksumSha256,
      mimeType: textbook.mimeType,
      startPage: textbook.startPage,
      endPage: textbook.endPage,
      totalPages: textbook.totalPages,
    },
    quizzes: [
      {
        id: quiz.id,
        title: quiz.title,
        amharicTitle: quiz.amharicTitle,
        description: quiz.description,
        timeLimitMinutes: quiz.timeLimitMinutes,
        passingScore: quiz.passingScore,
        isPractice: quiz.isPractice,
        version: quiz.version,
        questions: quiz.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          amharicPrompt: q.amharicPrompt,
          orderIndex: q.orderIndex,
          points: q.points,
          explanation: q.explanation,
          amharicExplanation: q.amharicExplanation,
          choices: q.choices.map((c) => ({
            id: c.id,
            text: c.text,
            amharicText: c.amharicText,
            orderIndex: c.orderIndex,
            isCorrect: c.isCorrect,
          })),
        })),
      },
    ],
    references: [
      {
        id: `ref-${chapter.id}-1`,
        title: cfg.refTitle,
        amharicTitle: cfg.refAmharicTitle,
        url: cfg.refDocUrl,
        isDownloadable: true,
        downloadableDocUrl: cfg.refDocUrl,
        downloadableDocSize: refSize,
        downloadableDocChecksum: refDocChecksum,
      },
    ],
  };

  await prisma.learningPackage.upsert({
    where: {
      chapterId_version: {
        chapterId: chapter.id,
        version: 1,
      },
    },
    update: {
      manifestJson: manifestData,
      status: PackageStatus.PUBLISHED,
    },
    create: {
      chapterId: chapter.id,
      version: 1,
      status: PackageStatus.PUBLISHED,
      manifestJson: manifestData,
      checksumSha256: textbookChecksum,
      packageSizeBytes: totalSizeBytes,
    },
  });

  console.log(`  ✓ Seeded & Published: Grade ${cfg.gradeLevel} → ${cfg.subjectName} → ${cfg.chapterTitle}`);
}

async function main() {
  console.log('🌱 Starting Comprehensive EOTC Learning Platform database seeding...');

  // 1. Seed Users (Admin, Teacher, Student)
  const adminPasswordHash = await bcrypt.hash('AdminSecurePassword2026!', 10);
  const teacherPasswordHash = await bcrypt.hash('TeacherPassword2026!', 10);
  const studentPasswordHash = await bcrypt.hash('StudentPassword2026!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eotc-andnet.org' },
    update: {},
    create: {
      email: 'admin@eotc-andnet.org',
      passwordHash: adminPasswordHash,
      fullName: 'ሊቀ ጉባኤ Admin',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@eotc-andnet.org' },
    update: {},
    create: {
      email: 'teacher@eotc-andnet.org',
      passwordHash: teacherPasswordHash,
      fullName: 'መምህር ተስፋዬ (Teacher Tesfaye)',
      role: Role.TEACHER,
      isActive: true,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@eotc-andnet.org' },
    update: {},
    create: {
      email: 'student@eotc-andnet.org',
      passwordHash: studentPasswordHash,
      fullName: 'ዮሐንስ ዳዊት (Yohannes Dawit)',
      role: Role.STUDENT,
      isActive: true,
    },
  });

  console.log(`👤 Users seeded: Admin (${admin.email}), Teacher (${teacher.email}), Student (${student.email})`);

  // 2. Seed Grades 1-4
  const gradesData = [
    { level: 1, name: 'Grade 1', amharicName: 'ክፍል ፩ (Grade 1)', description: 'የመጀመሪያ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 1 },
    { level: 2, name: 'Grade 2', amharicName: 'ክፍል ፪ (Grade 2)', description: 'ሁለተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 2 },
    { level: 3, name: 'Grade 3', amharicName: 'ክፍል ፫ (Grade 3)', description: 'ሦስተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 3 },
    { level: 4, name: 'Grade 4', amharicName: 'ክፍል ፬ (Grade 4)', description: 'አራተኛ ደረጃ የሰንበት ትምህርት ቤት ትምህርት', orderIndex: 4 },
  ];

  const gradeMap: Record<number, string> = {};

  for (const g of gradesData) {
    const record = await prisma.grade.upsert({
      where: { level: g.level },
      update: { name: g.name, amharicName: g.amharicName },
      create: g,
    });
    gradeMap[g.level] = record.id;
  }

  console.log('📚 Grades 1-4 initialized.');

  // ==========================================
  // GRADE 1 CURRICULUM
  // ==========================================
  console.log('\n📖 Seeding Grade 1 Curriculum...');

  // Grade 1, Subject 1, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 1,
      gradeName: 'Grade 1',
      gradeAmharicName: 'ክፍል ፩ (Grade 1)',
      subjectCode: 'CHR-L1',
      subjectName: 'Christian Life',
      subjectAmharicName: 'የክርስትና ሕይወት',
      subjectDescription: 'መሠረታዊ የክርስትና ሕይወት ሥነ ምግባር እና ትምህርት',
      subjectOrder: 1,
      chapterNumber: 1,
      chapterTitle: 'Foundations of Christian Faith',
      chapterAmharicTitle: 'ምዕራፍ ፩: የክርስትና ሃይማኖት መሠረቶች',
      chapterDescription: 'ስለ እግዚአብሔር አምላክነት፣ ስለ ፍጥረት እና ስለ መጀመሪያው ሕግጋት የሚገልጽ ትምህርት',
      chapterOrder: 1,
      textbookTitle: 'የክርስትና ሕይወት ፩ኛ ክፍል መጽሐፍ',
      startPage: 1,
      endPage: 24,
      totalPages: 120,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade1-christian-life.pdf',
      quizTitle: 'Chapter 1 Practice Quiz',
      quizAmharicTitle: 'ምዕራፍ ፩ መመዘኛ ጥያቄዎች',
      questionPrompt: 'What is the primary foundation of Christian faith?',
      questionAmharicPrompt: 'የክርስትና ሃይማኖት ዋናው መሠረት ምንድን ነው?',
      explanation: 'The Holy Trinity is the central foundation of Orthodox Christian doctrine.',
      amharicExplanation: 'በቅድስት ሥላሴ አንድነትና ሦስትነት ማመን የሃይማኖታችን ዋና መሠረት ነው።',
      choices: [
        { text: 'Belief in the Holy Trinity', amharicText: 'በሥላሴ አንድነትና ሦስትነት ማመን', orderIndex: 1, isCorrect: true },
        { text: 'Material wealth', amharicText: 'ቁሳዊ ሀብት ማካበት', orderIndex: 2, isCorrect: false },
        { text: 'Physical strength', amharicText: 'የሥጋዊ ኃይል', orderIndex: 3, isCorrect: false },
      ],
      refTitle: 'Tewahedo Faith Reference Summary',
      refAmharicTitle: 'የተዋሕዶ እምነት አጠቃላይ ማጠቃለያ ሰነድ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/faith-summary.pdf',
      webUrl: 'https://eotc-andnet.org',
    },
    gradeMap[1]!
  );

  // Grade 1, Subject 1, Chapter 2
  await seedCompleteChapter(
    {
      gradeLevel: 1,
      gradeName: 'Grade 1',
      gradeAmharicName: 'ክፍል ፩ (Grade 1)',
      subjectCode: 'CHR-L1',
      subjectName: 'Christian Life',
      subjectAmharicName: 'የክርስትና ሕይወት',
      subjectDescription: 'መሠረታዊ የክርስትና ሕይወት ሥነ ምግባር እና ትምህርት',
      subjectOrder: 1,
      chapterNumber: 2,
      chapterTitle: 'The Sign of the Cross and Daily Prayer',
      chapterAmharicTitle: 'ምዕራፍ ፪: የማማተብ ምሥጢር እና የዘወትር ጸሎት',
      chapterDescription: 'ስለ ቅዱስ መስቀል ምልክት ማማተብ እና በየዕለቱ ስለሚደረጉ ጸሎቶች መሠረታዊ ትምህርት',
      chapterOrder: 2,
      textbookTitle: 'የክርስትና ሕይወት ፩ኛ ክፍል መጽሐፍ',
      startPage: 25,
      endPage: 48,
      totalPages: 120,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade1-christian-life.pdf',
      quizTitle: 'Chapter 2 Practice Quiz',
      quizAmharicTitle: 'ምዕራፍ ፪ መመዘኛ ጥያቄዎች',
      questionPrompt: 'How do Orthodox Christians make the sign of the cross?',
      questionAmharicPrompt: 'ኦርቶዶክሳውያን ክርስቲያኖች በመስቀል ምልክት የሚያማትቡት እንዴት ነው?',
      explanation: 'We cross ourselves from forehead to chest, and from left shoulder to right shoulder.',
      amharicExplanation: 'ከግንባር ወደ ደረት፣ ከዚያም ከግራ ወደ ቀኝ ትከሻ በማማተብ ከጨለማ ወደ ብርሃን መሸጋገራችንን እንመሰክራለን።',
      choices: [
        { text: 'From forehead to chest, left to right', amharicText: 'ከግንባር ወደ ደረት፣ ከግራ ወደ ቀኝ ትከሻ', orderIndex: 1, isCorrect: true },
        { text: 'From right to left only', amharicText: 'ከቀኝ ወደ ግራ ብቻ', orderIndex: 2, isCorrect: false },
        { text: 'Without touching chest', amharicText: 'ደረት ሳይነካ', orderIndex: 3, isCorrect: false },
      ],
      refTitle: 'Daily Prayer Book Guide',
      refAmharicTitle: 'የዘወትር ጸሎት መመሪያ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/prayer-guide.pdf',
      webUrl: 'https://eotc-andnet.org/prayer',
    },
    gradeMap[1]!
  );

  // Grade 1, Subject 2, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 1,
      gradeName: 'Grade 1',
      gradeAmharicName: 'ክፍል ፩ (Grade 1)',
      subjectCode: 'LIT-L1',
      subjectName: 'Church Order & Liturgy',
      subjectAmharicName: 'ሥርዓተ ቤተ ክርስቲያን',
      subjectDescription: 'የኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን መሠረታዊ ሥርዓት',
      subjectOrder: 2,
      chapterNumber: 1,
      chapterTitle: 'The Church Building and Sacred Vessels',
      chapterAmharicTitle: 'ምዕራፍ ፩: የቤተ ክርስቲያን ሕንጻና ንዋያተ ቅድሳት',
      chapterDescription: 'ስለ ሦስቱ ክፍለ ሕንጻዎች (ቅኔ ማኅሌት፣ ቅድስት፣ መቅደስ) እና ስለ ንዋያተ ቅድሳት',
      chapterOrder: 1,
      textbookTitle: 'ሥርዓተ ቤተ ክርስቲያን ፩ኛ ክፍል መማሪያ',
      startPage: 1,
      endPage: 32,
      totalPages: 140,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade1-liturgy.pdf',
      quizTitle: 'Church Order Chapter 1 Quiz',
      quizAmharicTitle: 'ሥርዓተ ቤተ ክርስቲያን ምዕራፍ ፩ ፈተና',
      questionPrompt: 'What are the three sacred sections of the traditional Ethiopian Orthodox church building?',
      questionAmharicPrompt: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ሦስቱ ክፍሎች እነማን ናቸው?',
      explanation: 'The three divisions are Qine Mahlet, Qiddist, and Maqdas (Holy of Holies).',
      amharicExplanation: 'ሦስቱ ክፍሎች ቅኔ ማኅሌት፣ ቅድስት እና መቅደስ ናቸው።',
      choices: [
        { text: 'Qine Mahlet, Qiddist, and Maqdas', amharicText: 'ቅኔ ማኅሌት፣ ቅድስት እና መቅደስ', orderIndex: 1, isCorrect: true },
        { text: 'Courtyard and Hall only', amharicText: 'አደባባይ እና አዳራሽ ብቻ', orderIndex: 2, isCorrect: false },
      ],
      refTitle: 'Sacred Architecture Reference',
      refAmharicTitle: 'የቤተ መቅደስ ሥርዓት ሰነድ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/architecture.pdf',
      webUrl: 'https://eotc-andnet.org/liturgy',
    },
    gradeMap[1]!
  );

  // ==========================================
  // GRADE 2 CURRICULUM
  // ==========================================
  console.log('\n📖 Seeding Grade 2 Curriculum...');

  // Grade 2, Subject 1, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 2,
      gradeName: 'Grade 2',
      gradeAmharicName: 'ክፍል ፪ (Grade 2)',
      subjectCode: 'BIB-L2',
      subjectName: 'Biblical Studies',
      subjectAmharicName: 'ትምህርተ መጽሐፍ ቅዱስ',
      subjectDescription: 'ስለ ብሉይና ሐዲስ ኪዳናት መጻሕፍት አከፋፈልና ይዘት',
      subjectOrder: 1,
      chapterNumber: 1,
      chapterTitle: 'Introduction to the Holy Scriptures',
      chapterAmharicTitle: 'ምዕራፍ ፩: የቅዱሳት መጻሕፍት መግቢያ',
      chapterDescription: 'መጽሐፍ ቅዱስ በመንፈስ ቅዱስ መሪነት የተጻፈ የእግዚአብሔር ቃል መሆኑን ማወቅ',
      chapterOrder: 1,
      textbookTitle: 'ትምህርተ መጽሐፍ ቅዱስ ፪ኛ ክፍል',
      startPage: 1,
      endPage: 28,
      totalPages: 160,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade2-bible.pdf',
      quizTitle: 'Biblical Studies Chapter 1 Quiz',
      quizAmharicTitle: 'ትምህርተ መጽሐፍ ቅዱስ ምዕራፍ ፩ ፈተና',
      questionPrompt: 'How many canonical books are included in the Ethiopian Orthodox Tewahedo Bible canon?',
      questionAmharicPrompt: 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ቀኖና መሠረት የመጽሐፍ ቅዱስ መጻሕፍት ቁጥር ስንት ነው?',
      explanation: 'The EOTC Bible canon contains 81 canonical books (46 Old Testament and 35 New Testament).',
      amharicExplanation: 'የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ሰማንያ አንድ (፹፩) የብሉይና የሐዲስ ኪዳን ቅዱሳት መጻሕፍትን ትቀበላለች።',
      choices: [
        { text: '81 Books (፹፩ መጻሕፍት)', amharicText: '፹፩ (81) መጻሕፍት', orderIndex: 1, isCorrect: true },
        { text: '66 Books', amharicText: '፷፮ (66) መጻሕፍት', orderIndex: 2, isCorrect: false },
        { text: '73 Books', amharicText: '፸፫ (73) መጻሕፍት', orderIndex: 3, isCorrect: false },
      ],
      refTitle: 'Canon of 81 Books Reference',
      refAmharicTitle: 'የሰማንያ አሐዱ (፹፩) መጻሕፍት ዝርዝር',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/canon-81.pdf',
      webUrl: 'https://eotc-andnet.org/canon',
    },
    gradeMap[2]!
  );

  // Grade 2, Subject 2, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 2,
      gradeName: 'Grade 2',
      gradeAmharicName: 'ክፍል ፪ (Grade 2)',
      subjectCode: 'DOG-L2',
      subjectName: 'Orthodox Dogmatics',
      subjectAmharicName: 'ሃይማኖተ አበው',
      subjectDescription: 'የኦርቶዶክስ ተዋሕዶ ሃይማኖት ዐበይት ምሥጢራት',
      subjectOrder: 2,
      chapterNumber: 1,
      chapterTitle: 'The Mystery of the Holy Trinity',
      chapterAmharicTitle: 'ምዕራፍ ፩: ምሥጢረ ሥላሴ',
      chapterDescription: 'በስም፣ በአካል፣ በግብር ሦስትነት፤ በባሕርይ፣ በህልውና፣ በመለኮት አንድነት',
      chapterOrder: 1,
      textbookTitle: 'ሃይማኖተ አበው ፪ኛ ክፍል',
      startPage: 1,
      endPage: 35,
      totalPages: 180,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade2-dogma.pdf',
      quizTitle: 'Dogmatics Chapter 1 Quiz',
      quizAmharicTitle: 'ምሥጢረ ሥላሴ ፈተና',
      questionPrompt: 'What do we confess regarding the Holy Trinity?',
      questionAmharicPrompt: 'ስለ ቅድስት ሥላሴ አንድነትና ሦስትነት የምንመሰክረው ምንድን ነው?',
      explanation: 'We confess that God is One in essence, divinity, and will; and Three in Persons (Father, Son, Holy Spirit).',
      amharicExplanation: 'በስም፣ በአካል፣ በግብር ሦስት ስንል፤ በባሕርይ፣ በህልውና፣ በሥልጣን፣ በመለኮት አንድ አምላክ ብለን እናምናለን።',
      choices: [
        { text: 'Three in Persons, One in Essence', amharicText: 'በአካል ሦስት፣ በባሕርይ አንድ', orderIndex: 1, isCorrect: true },
        { text: 'Three separate gods', amharicText: 'ሦስት የተለያዩ አማልክት', orderIndex: 2, isCorrect: false },
      ],
      refTitle: 'Theological Creed Summary',
      refAmharicTitle: 'የሃይማኖት ጸሎት ማብራሪያ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/creed-summary.pdf',
      webUrl: 'https://eotc-andnet.org/creed',
    },
    gradeMap[2]!
  );

  // ==========================================
  // GRADE 3 CURRICULUM
  // ==========================================
  console.log('\n📖 Seeding Grade 3 Curriculum...');

  // Grade 3, Subject 1, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 3,
      gradeName: 'Grade 3',
      gradeAmharicName: 'ክፍል ፫ (Grade 3)',
      subjectCode: 'HIS-L3',
      subjectName: 'Ethiopian Church History',
      subjectAmharicName: 'የኢትዮጵያ ቤተ ክርስቲያን ታሪክ',
      subjectDescription: 'ክርስትና ወደ ኢትዮጵያ የገባበትና የተስፋፋበት ታሪክ',
      subjectOrder: 1,
      chapterNumber: 1,
      chapterTitle: 'Christianity in Ancient Aksum',
      chapterAmharicTitle: 'ምዕራፍ ፩: ክርስትና በዘመነ አክሱም - ዘመነ አብርሃ ወአጽብሐ',
      chapterDescription: 'ስለ ቅዱስ ፍሬምናጦስ (አባ ሰላማ ከሣቴ ብርሃን) እና ስለ ነገሥታቱ አብርሃ ወአጽብሐ',
      chapterOrder: 1,
      textbookTitle: 'የኢትዮጵያ ቤተ ክርስቲያን ታሪክ ፫ኛ ክፍል',
      startPage: 1,
      endPage: 30,
      totalPages: 190,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade3-history.pdf',
      quizTitle: 'History Chapter 1 Quiz',
      quizAmharicTitle: 'የኢትዮጵያ ቤተ ክርስቲያን ታሪክ ፈተና',
      questionPrompt: 'Who was the first Bishop of Ethiopia, consecrated by St. Athanasius of Alexandria?',
      questionAmharicPrompt: 'በቅዱስ አትናቴዎስ አንብሮተ እድ የመጀመሪያው የኢትዮጵያ ጳጳስ ሆነው የተሾሙት አባት ማን ናቸው?',
      explanation: 'St. Frumentius, known as Abba Salama Kesate Berhan, was consecrated around 330 A.D.',
      amharicExplanation: 'አባ ሰላማ ከሣቴ ብርሃን (ቅዱስ ፍሬምናጦስ) የመጀመሪያው ጳጳስ ሆነው ተሹመዋል።',
      choices: [
        { text: 'Abba Salama Kesate Berhan (St. Frumentius)', amharicText: 'አባ ሰላማ ከሣቴ ብርሃን', orderIndex: 1, isCorrect: true },
        { text: 'St. Yared', amharicText: 'ቅዱስ ያሬድ', orderIndex: 2, isCorrect: false },
        { text: 'St. Lalibela', amharicText: 'ቅዱስ ላሊበላ', orderIndex: 3, isCorrect: false },
      ],
      refTitle: 'Chronicles of Aksumite Saints',
      refAmharicTitle: 'የአክሱም ዘመን ታሪክ ሰነድ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/aksum-history.pdf',
      webUrl: 'https://eotc-andnet.org/history',
    },
    gradeMap[3]!
  );

  // Grade 3, Subject 2, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 3,
      gradeName: 'Grade 3',
      gradeAmharicName: 'ክፍል ፫ (Grade 3)',
      subjectCode: 'SAC-L3',
      subjectName: 'Sacred Liturgy & Sacraments',
      subjectAmharicName: 'ሥርዓተ ቅዳሴና ምሥጢራት',
      subjectDescription: 'ስለ ሰባቱ ምሥጢራተ ቤተ ክርስቲያን እና ቅዳሴ',
      subjectOrder: 2,
      chapterNumber: 1,
      chapterTitle: 'The Seven Sacraments of the Church',
      chapterAmharicTitle: 'ምዕራፍ ፩: ሰባቱ ምሥጢራተ ቤተ ክርስቲያን',
      chapterDescription: 'ምሥጢረ ጥምቀት፣ ሜሮን፣ ቁርባን፣ ክህነት፣ ተክሊል፣ ንስሐ፣ ቀንዲል',
      chapterOrder: 1,
      textbookTitle: 'ምሥጢራተ ቤተ ክርስቲያን ፫ኛ ክፍል',
      startPage: 1,
      endPage: 38,
      totalPages: 160,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade3-sacraments.pdf',
      quizTitle: 'Sacraments Chapter 1 Quiz',
      quizAmharicTitle: 'ምሥጢራተ ቤተ ክርስቲያን ፈተና',
      questionPrompt: 'Which sacrament is considered the gate to all other Christian mysteries?',
      questionAmharicPrompt: 'ወደ ሌሎች መንፈሳዊ ምሥጢራት ሁሉ መግቢያ በር ተብሎ የሚታወቀው ምሥጢር የትኛው ነው?',
      explanation: 'Holy Baptism is the foundational mystery through which we are born of water and Spirit.',
      amharicExplanation: 'ምሥጢረ ጥምቀት ወደ መንግሥተ ሰማያትና ወደ ሌሎች ምሥጢራት መግቢያ በር ነው።',
      choices: [
        { text: 'Holy Baptism (ምሥጢረ ጥምቀት)', amharicText: 'ምሥጢረ ጥምቀት', orderIndex: 1, isCorrect: true },
        { text: 'Holy Matrimony (ምሥጢረ ተክሊል)', amharicText: 'ምሥጢረ ተክሊል', orderIndex: 2, isCorrect: false },
      ],
      refTitle: 'Seven Sacraments Manual',
      refAmharicTitle: 'ሰባቱ ምሥጢራት መመሪያ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/sacraments-manual.pdf',
      webUrl: 'https://eotc-andnet.org/sacraments',
    },
    gradeMap[3]!
  );

  // ==========================================
  // GRADE 4 CURRICULUM
  // ==========================================
  console.log('\n📖 Seeding Grade 4 Curriculum...');

  // Grade 4, Subject 1, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 4,
      gradeName: 'Grade 4',
      gradeAmharicName: 'ክፍል ፬ (Grade 4)',
      subjectCode: 'GEE-L4',
      subjectName: 'Geez Language & Sacred Hymnody',
      subjectAmharicName: 'ግዕዝ እና ዜማ',
      subjectDescription: 'የግዕዝ ቋንቋ መሠረታዊ ህጎችና የቅዱስ ያሬድ ዜማዎች',
      subjectOrder: 1,
      chapterNumber: 1,
      chapterTitle: 'Fundamentals of the Geez Language',
      chapterAmharicTitle: 'ምዕራፍ ፩: መሠረታዊ የግዕዝ ፊደላትና ቃላት',
      chapterDescription: 'የግዕዝ ፊደላት አቆጣጠር፣ ፳፮ቱ መሠረታዊ ሆሄያት እና የቁጥሮች ምሥጢር',
      chapterOrder: 1,
      textbookTitle: 'የግዕዝ ቋንቋ መማሪያ ፬ኛ ክፍል',
      startPage: 1,
      endPage: 26,
      totalPages: 130,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade4-geez.pdf',
      quizTitle: 'Geez Language Chapter 1 Quiz',
      quizAmharicTitle: 'የግዕዝ ቋንቋ ምዕራፍ ፩ ፈተና',
      questionPrompt: 'Who composed the sacred three-mode hymnody (Ge\'ez, Ezel, Araray) of the Ethiopian Church?',
      questionAmharicPrompt: 'ሦስቱን የዜማ ስልቶች (ግዕዝ፣ ዕዝል፣ አራራይ) ያዘጋጀው ታላቁ የዜማ ሊቅ ማን ነው?',
      explanation: 'Saint Yared composed the sacred chant in the 6th century A.D. through divine inspiration.',
      amharicExplanation: 'ቅዱስ ያሬድ በስድስተኛው መቶ ክፍለ ዘመን በመንፈስ ቅዱስ ተመርቶ ሦስቱን የዜማ ስልቶች ደርሷል።',
      choices: [
        { text: 'Saint Yared (ቅዱስ ያሬድ)', amharicText: 'ቅዱስ ያሬድ', orderIndex: 1, isCorrect: true },
        { text: 'Abba Giorgis of Gascha', amharicText: 'አባ ጊዮርጊስ ዘጋስጫ', orderIndex: 2, isCorrect: false },
      ],
      refTitle: 'Grammar of Classical Geez',
      refAmharicTitle: 'የግዕዝ ሰዋስው መመሪያ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/geez-grammar.pdf',
      webUrl: 'https://eotc-andnet.org/geez',
    },
    gradeMap[4]!
  );

  // Grade 4, Subject 2, Chapter 1
  await seedCompleteChapter(
    {
      gradeLevel: 4,
      gradeName: 'Grade 4',
      gradeAmharicName: 'ክፍል ፬ (Grade 4)',
      subjectCode: 'ETH-L4',
      subjectName: 'Christian Ethics & Moral Living',
      subjectAmharicName: 'ሥነ ምግባር',
      subjectDescription: 'የክርስቲያን ሥነ ምግባር፣ ዐሠርቱ ቃላትና አንቀጸ ብፁዓን',
      subjectOrder: 2,
      chapterNumber: 1,
      chapterTitle: 'The Ten Commandments and Christian Duty',
      chapterAmharicTitle: 'ምዕራፍ ፩: ዐሠርቱ ቃላትና የክርስቲያን ግዴታ',
      chapterDescription: 'ስለ እግዚአብሔር ፍቅር እና ስለ ባልንጀራ ፍቅር የሚያስተምሩት ዐሠርቱ ቃላት',
      chapterOrder: 1,
      textbookTitle: 'ሥነ ምግባር ፬ኛ ክፍል መማሪያ',
      startPage: 1,
      endPage: 34,
      totalPages: 150,
      fileUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/textbooks/grade4-ethics.pdf',
      quizTitle: 'Ethics Chapter 1 Quiz',
      quizAmharicTitle: 'ሥነ ምግባር ፈተና',
      questionPrompt: 'What is the greatest commandment in the Law according to our Lord and Savior Jesus Christ?',
      questionAmharicPrompt: 'በኦሪት ከተጻፉት ትእዛዛት መካከል ዋናይቱና ታላቂቱ ትእዛዝ የትኛዋ ናት?',
      explanation: 'To love the Lord your God with all your heart, soul, and mind; and to love your neighbor as yourself.',
      amharicExplanation: 'እግዚአብሔር አምላክህን በፍጹም ልብህ ውደድ፤ ባልንጀራህንም እንደ ራስህ ውደድ የሚሉት ናቸው።',
      choices: [
        { text: 'Love of God and Love of Neighbor', amharicText: 'እግዚአብሔርን መውደድ እና ባልንጀራን መውደድ', orderIndex: 1, isCorrect: true },
        { text: 'Seeking worldly honour', amharicText: 'የዓለምን ክብር መፈለግ', orderIndex: 2, isCorrect: false },
      ],
      refTitle: 'Christian Ethics Commentary',
      refAmharicTitle: 'የክርስቲያናዊ ሥነ ምግባር ማብራሪያ',
      refDocUrl: 'https://res.cloudinary.com/eotc-learning/raw/upload/v1/references/ethics-guide.pdf',
      webUrl: 'https://eotc-andnet.org/ethics',
    },
    gradeMap[4]!
  );

  console.log('\n============================================================');
  console.log('✅ ALL GRADES 1–4 CURRICULUM SEEDED & FULLY PUBLISHED!');
  console.log('============================================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
