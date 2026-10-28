const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sampleUrl = 'http://localhost:4000/uploads/textbooks/eotc-sample-curriculum.pdf';
  const sampleRefUrl = 'http://localhost:4000/uploads/references/sample-reference-doc.pdf';

  // 1. Update textbooks
  const tUpdate = await prisma.textbookDocument.updateMany({
    where: { fileUrl: { contains: 'cloudinary' } },
    data: {
      fileUrl: sampleUrl,
      fileSize: 6776728,
      totalPages: 60,
    },
  });
  console.log('Updated textbooks:', tUpdate.count);

  // 2. Update references
  const rUpdate = await prisma.referenceLink.updateMany({
    where: { downloadableDocUrl: { contains: 'cloudinary' } },
    data: {
      downloadableDocUrl: sampleRefUrl,
      downloadableDocSize: 6776728,
    },
  });
  console.log('Updated references:', rUpdate.count);

  // 3. Update subjects master textbook
  const sUpdate = await prisma.subject.updateMany({
    where: { textbookUrl: null },
    data: {
      textbookUrl: sampleUrl,
      textbookFileName: 'eotc-sample-curriculum.pdf',
      textbookFileSize: 6776728,
      textbookTotalPages: 60,
    },
  });
  console.log('Updated subjects:', sUpdate.count);

  // 4. Update existing package manifests
  const chapters = await prisma.chapter.findMany({
    where: { isPublished: true },
    include: {
      textbook: true,
      quizzes: {
        include: {
          questions: {
            include: { choices: true },
          },
        },
      },
      references: true,
      packages: true,
    },
  });

  for (const ch of chapters) {
    if (!ch.textbook) continue;
    const manifest = {
      chapterId: ch.id,
      version: ch.version,
      publishedAt: ch.updatedAt.toISOString(),
      textbook: {
        id: ch.textbook.id,
        title: ch.textbook.title,
        fileUrl: ch.textbook.fileUrl,
        fileSize: ch.textbook.fileSize,
        checksumSha256: ch.textbook.checksumSha256,
        mimeType: ch.textbook.mimeType,
        startPage: ch.textbook.startPage,
        endPage: ch.textbook.endPage,
        totalPages: ch.textbook.totalPages,
      },
      quizzes: ch.quizzes.map((q) => ({
        id: q.id,
        title: q.title,
        amharicTitle: q.amharicTitle,
        description: q.description,
        timeLimitMinutes: q.timeLimitMinutes,
        passingScore: q.passingScore,
        isPractice: q.isPractice,
        version: ch.version,
        questions: q.questions.map((ques) => ({
          id: ques.id,
          prompt: ques.prompt,
          amharicPrompt: ques.amharicPrompt,
          orderIndex: ques.orderIndex,
          points: ques.points,
          explanation: ques.explanation,
          amharicExplanation: ques.amharicExplanation,
          choices: ques.choices.map((c) => ({
            id: c.id,
            text: c.text,
            amharicText: c.amharicText,
            orderIndex: c.orderIndex,
            isCorrect: c.isCorrect,
          })),
        })),
      })),
      references: ch.references.map((r) => ({
        id: r.id,
        title: r.title,
        amharicTitle: r.amharicTitle,
        url: r.url,
        isDownloadable: r.isDownloadable,
        downloadableDocUrl: r.downloadableDocUrl,
        downloadableDocSize: r.downloadableDocSize,
        downloadableDocChecksum: r.downloadableDocChecksum,
      })),
      totalSizeBytes: ch.textbook.fileSize,
      checksumSha256: ch.textbook.checksumSha256,
    };

    await prisma.learningPackage.upsert({
      where: { chapterId_version: { chapterId: ch.id, version: ch.version } },
      create: {
        chapterId: ch.id,
        version: ch.version,
        manifestJson: manifest,
        packageSizeBytes: ch.textbook.fileSize,
        checksumSha256: ch.textbook.checksumSha256 || '8a5d603446a2f0554ac7482e74eca635066a75263b1aed87b2f639c894d75083',
      },
      update: {
        manifestJson: manifest,
        packageSizeBytes: ch.textbook.fileSize,
        checksumSha256: ch.textbook.checksumSha256 || '8a5d603446a2f0554ac7482e74eca635066a75263b1aed87b2f639c894d75083',
      },
    });
  }
  console.log('Synchronized package manifests for', chapters.length, 'chapters');
}

main().catch(console.error).finally(() => prisma.$disconnect());
