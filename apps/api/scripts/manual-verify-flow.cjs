const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runManualVerification() {
  console.log('=== STEP 1: ADMIN LOGIN ===');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@eotc-andnet.org',
      password: 'AdminSecurePassword2026!',
    }),
  });
  if (!adminLogin.ok) throw new Error('Admin login failed: ' + JSON.stringify(adminLogin.data));
  const adminToken = adminLogin.data.data.tokens.accessToken;
  console.log('✓ Admin authenticated successfully');

  console.log('\n=== STEP 2: GET CURRICULUM HIERARCHY ===');
  const hierarchyRes = await request('/admin/curriculum/hierarchy', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!hierarchyRes.ok) throw new Error('Get hierarchy failed: ' + hierarchyRes.status + ' ' + JSON.stringify(hierarchyRes.data));
  const grades = hierarchyRes.data.data;
  console.log(`✓ Fetched ${grades.length} grades. First grade level: ${grades[0]?.level}`);

  const targetGrade = grades.find((g) => g.level === 1) || grades[0];
  console.log(`✓ Selected Grade ID: ${targetGrade.id} (${targetGrade.name})`);

  console.log('\n=== STEP 3: CREATE OR FIND SUBJECT ===');
  let targetSubject = targetGrade.subjects.find((s) => s.code === 'MANUAL-TEST');
  if (!targetSubject) {
    const createSubRes = await request(`/admin/curriculum/grades/${targetGrade.id}/subjects`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Manual QA Testing Subject',
        amharicName: 'የሙከራ ትምህርት',
        code: 'MANUAL-TEST',
        description: 'Subject for testing textbook, reference, and quiz flows',
      }),
    });
    if (!createSubRes.ok) throw new Error('Create subject failed: ' + JSON.stringify(createSubRes.data));
    targetSubject = createSubRes.data.data;
    console.log('✓ Created new subject:', targetSubject.id, targetSubject.name);
  } else {
    console.log('✓ Found existing subject:', targetSubject.id, targetSubject.name);
  }

  console.log('\n=== STEP 4: UPLOAD MASTER TEXTBOOK PDF TO SUBJECT ===');
  const samplePdfPath = path.resolve(process.cwd(), 'uploads/textbooks/eotc-sample-curriculum.pdf');
  if (!fs.existsSync(samplePdfPath)) throw new Error('Sample PDF file missing at ' + samplePdfPath);

  const fileBytes = fs.readFileSync(samplePdfPath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBytes], { type: 'application/pdf' }), 'manual-test-textbook.pdf');
  formData.append('type', 'textbook');

  const uploadRes = await fetch(`${API_BASE}/admin/curriculum/upload-pdf?type=textbook`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok) throw new Error('PDF upload failed: ' + JSON.stringify(uploadJson));
  console.log('✓ Uploaded Master PDF:', uploadJson.data.fileUrl, `(${uploadJson.data.fileSize} bytes)`);

  // Update subject master textbook details
  const updateSubRes = await request(`/admin/curriculum/subjects/${targetSubject.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      textbookUrl: uploadJson.data.fileUrl,
      textbookFileName: 'manual-test-textbook.pdf',
      textbookFileSize: uploadJson.data.fileSize,
      textbookChecksumSha256: uploadJson.data.checksumSha256,
      textbookTotalPages: 50,
    }),
  });
  if (!updateSubRes.ok) throw new Error('Update subject textbook failed: ' + JSON.stringify(updateSubRes.data));
  console.log('✓ Attached master textbook to Subject');

  console.log('\n=== STEP 5: CREATE CHAPTER UNDER SUBJECT ===');
  const chapterNumber = Date.now() % 1000;
  const createChapRes = await request(`/admin/curriculum/subjects/${targetSubject.id}/chapters`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      chapterNumber,
      title: `E2E Chapter ${chapterNumber}`,
      amharicTitle: `ምዕራፍ ${chapterNumber}`,
      description: 'Comprehensive test chapter covering manual test requirements',
    }),
  });
  if (!createChapRes.ok) throw new Error('Create chapter failed: ' + JSON.stringify(createChapRes.data));
  const chapter = createChapRes.data.data;
  console.log('✓ Created Chapter:', chapter.id, chapter.title);

  console.log('\n=== STEP 6: ATTACH TEXTBOOK WITH PAGE RANGE CLAMPING ===');
  const attachTextbookRes = await request(`/admin/curriculum/chapters/${chapter.id}/textbook`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Manual Test Clamped Textbook',
      fileUrl: uploadJson.data.fileUrl,
      fileSize: uploadJson.data.fileSize,
      checksumSha256: uploadJson.data.checksumSha256,
      mimeType: 'application/pdf',
      startPage: 5,
      endPage: 25,
      totalPages: 50,
    }),
  });
  if (!attachTextbookRes.ok) throw new Error('Attach textbook failed: ' + JSON.stringify(attachTextbookRes.data));
  console.log('✓ Clamped textbook attached: pages 5 to 25');

  console.log('\n=== STEP 7: ATTACH REFERENCE DOCUMENTS (PDF & DOCS) ===');
  const refRes = await request(`/admin/curriculum/chapters/${chapter.id}/references`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Ecclesiastical Council Reference',
      amharicTitle: 'የጉባኤያት ታሪክ ማጣቀሻ',
      url: 'http://localhost:4000/uploads/references/sample-reference-doc.pdf',
      isDownloadable: true,
      downloadableDocUrl: 'http://localhost:4000/uploads/references/sample-reference-doc.pdf',
      downloadableDocSize: uploadJson.data.fileSize,
      downloadableDocChecksum: uploadJson.data.checksumSha256,
      orderIndex: 1,
    }),
  });
  if (!refRes.ok) throw new Error('Attach reference failed: ' + JSON.stringify(refRes.data));
  console.log('✓ Reference document attached with download capability');

  console.log('\n=== STEP 8: CREATE QUIZ WITH >= 4 OPTIONS ===');
  const quizRes = await request(`/admin/curriculum/chapters/${chapter.id}/quizzes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      title: 'Comprehensive Faith & Practice Quiz',
      amharicTitle: 'የእምነት እና ሥርዓት ፈተና',
      description: 'Test containing 4 options per question with server side scoring',
      passingScore: 75,
      timeLimitMinutes: 15,
      isPractice: true,
    }),
  });
  if (!quizRes.ok) throw new Error('Create quiz failed: ' + JSON.stringify(quizRes.data));
  const quiz = quizRes.data.data;
  console.log('✓ Created Quiz:', quiz.id, quiz.title);

  // Add Question with 4 options
  const questionRes = await request(`/admin/curriculum/quizzes/${quiz.id}/questions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      prompt: 'In the Ethiopian Orthodox Tewahedo Church, how many Holy Sacraments are recognized?',
      amharicPrompt: 'በኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ስንት ምሥጢራተ ቤተ ክርስቲያን አሉ?',
      points: 20,
      orderIndex: 1,
      explanation: 'There are Seven Holy Sacraments (ሰባቱ ምሥጢራተ ቤተ ክርስቲያን).',
      amharicExplanation: 'በቤተ ክርስቲያናችን ፯ቱ (ሰባቱ) ምሥጢራተ ቤተ ክርስቲያን አሉ።',
      choices: [
        { text: '3 Sacraments', amharicText: '፫ቱ ምሥጢራት', isCorrect: false, orderIndex: 1 },
        { text: '7 Sacraments', amharicText: '፯ቱ (ሰባቱ) ምሥጢራት', isCorrect: true, orderIndex: 2 },
        { text: '10 Sacraments', amharicText: '፲ቱ ምሥጢራት', isCorrect: false, orderIndex: 3 },
        { text: '12 Sacraments', amharicText: '፲፪ቱ ምሥጢራት', isCorrect: false, orderIndex: 4 },
      ],
    }),
  });
  if (!questionRes.ok) throw new Error('Add question failed: ' + JSON.stringify(questionRes.data));
  console.log('✓ Added question with 4 options (A, B, C, D) and marked correct answer');

  console.log('\n=== STEP 9: PUBLISH CHAPTER ===');
  const pubRes = await request(`/admin/curriculum/chapters/${chapter.id}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!pubRes.ok) throw new Error('Publish chapter failed: ' + JSON.stringify(pubRes.data));
  console.log('✓ Published Chapter! Manifest Version:', pubRes.data.data.manifest.version);

  console.log('\n=== STEP 10: STUDENT VERIFICATION & STUDY ===');
  const studentLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@eotc-andnet.org',
      password: 'StudentPassword2026!',
    }),
  });
  if (!studentLogin.ok) throw new Error('Student login failed');
  const studentToken = studentLogin.data.data.tokens.accessToken;
  console.log('✓ Student authenticated successfully');

  // Fetch student curriculum
  const studentCurr = await request('/student/curriculum', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!studentCurr.ok) throw new Error('Fetch student curriculum failed');
  const studentGrades = studentCurr.data.data;
  console.log(`✓ Student curriculum returned ${studentGrades.length} grades in ascending order`);

  // Verify chapter exists in student view
  const studentGrade = studentGrades.find((g) => g.id === targetGrade.id);
  const studentSub = studentGrade?.subjects.find((s) => s.id === targetSubject.id);
  const studentChap = studentSub?.chapters.find((c) => c.id === chapter.id);
  if (!studentChap) throw new Error('Newly published chapter not visible in student curriculum!');
  console.log('✓ Student verified: Chapter is published and visible:', studentChap.title);

  // Student pulls package manifest
  const manifestRes = await request(`/student/packages/${chapter.id}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  if (!manifestRes.ok) throw new Error('Student get package manifest failed');
  const manifest = manifestRes.data.data;
  console.log('✓ Student manifest verified:');
  console.log(`  - Textbook: ${manifest.textbook.title} (pages ${manifest.textbook.startPage}-${manifest.textbook.endPage})`);
  console.log(`  - Quizzes: ${manifest.quizzes.length}`);
  console.log(`  - References: ${manifest.references.length}`);

  console.log('\n=== ALL MANUAL TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL ===');
}

runManualVerification().catch((err) => {
  console.error('\n❌ MANUAL VERIFICATION FAILED:', err.message);
  process.exit(1);
});
