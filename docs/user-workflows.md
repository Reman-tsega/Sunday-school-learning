# EOTC Senbet Tmhrtbet Learning Platform — User Operational Workflows

## 1. Overview

This document provides clear, end-to-end operational workflows for both **Administrators** (who author, curate, and publish curriculum) and **Students** (who browse, download, study offline, and synchronize progress).

---

## 2. Administrator Workflows

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Grade Setup  │ ───►  │ 2. Subject Def  │ ───►  │ 3. Chapter Def  │ ───►  │ 4. Textbook Map │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └─────────────────┘
                                                                                       │
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐                │
│ 7. Publish Pkg  │ ◄───  │ 6. Ref Links    │ ◄───  │ 5. Practice Quiz│ ◄──────────────┘
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

### Workflow A: Authoring a Complete Curriculum Chapter

#### Step 1: Create Grade
- **Endpoint**: `POST /api/admin/curriculum/grades`
- **Payload**:
  ```json
  {
    "level": 1,
    "name": "Grade 1",
    "amharicName": "ክፍል ፩ (Grade 1)",
    "description": "የመጀመሪያ ደረጃ የሰንበት ትምህርት ቤት ትምህርት",
    "orderIndex": 1
  }
  ```

#### Step 2: Create Subject under Grade
- **Endpoint**: `POST /api/admin/curriculum/grades/:gradeId/subjects`
- **Payload**:
  ```json
  {
    "name": "Church History",
    "amharicName": "ታሪከ ቤተ ክርስቲያን",
    "code": "HIST-G1",
    "description": "የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተ ክርስቲያን ታሪክ",
    "orderIndex": 1
  }
  ```

#### Step 3: Create Chapter under Subject
- **Endpoint**: `POST /api/admin/curriculum/subjects/:subjectId/chapters`
- **Payload**:
  ```json
  {
    "chapterNumber": 1,
    "title": "Chapter 1: The Early Church and the Apostles",
    "amharicTitle": "ምዕራፍ ፩: የቀደምት ቤተ ክርስቲያንና ሐዋርያት",
    "description": "የሐዋርያት ጉባኤና የመጀመሪያዎቹ ክርስቲያኖች ሕይወት",
    "orderIndex": 1
  }
  ```

#### Step 4: Map Textbook PDF & Page Ranges
Assign the Cloudinary PDF URL and strictly clamp the reading window for this chapter:
- **Endpoint**: `PUT /api/admin/curriculum/chapters/:chapterId/textbook`
- **Payload**:
  ```json
  {
    "title": "ታሪከ ቤተ ክርስቲያን ፩ኛ ክፍል መማሪያ",
    "fileUrl": "https://res.cloudinary.com/eotc/raw/upload/v1/textbooks/grade1-history.pdf",
    "fileSize": 8388608,
    "checksumSha256": "8a3b5c7d...64charSha256",
    "mimeType": "application/pdf",
    "startPage": 1,
    "endPage": 30,
    "totalPages": 180
  }
  ```

#### Step 5: Create Practice Quiz & Questions
- **Create Quiz**: `POST /api/admin/curriculum/chapters/:chapterId/quizzes`
- **Add Question**: `POST /api/admin/curriculum/quizzes/:quizId/questions`
- **Payload**:
  ```json
  {
    "prompt": "በዓለ ኀምሳ ሐዋርያት መንፈስ ቅዱስን የተቀበሉት የት ነበር?",
    "amharicPrompt": "በዓለ ኀምሳ ሐዋርያት መንፈስ ቅዱስን የተቀበሉት የት ነበር?",
    "points": 10,
    "orderIndex": 1,
    "explanation": "ሐዋርያት በኢየሩሳሌም በጽርሐ ጽዮን ሳሉ መንፈስ ቅዱስ ወረደባቸው።",
    "choices": [
      { "text": "በኢየሩሳሌም በጽርሐ ጽዮን", "isCorrect": true, "orderIndex": 1 },
      { "text": "በሮም ከተማ", "isCorrect": false, "orderIndex": 2 },
      { "text": "በእስክንድርያ", "isCorrect": false, "orderIndex": 3 }
    ]
  }
  ```

#### Step 6: Attach References
- **Offline PDF Document**: Attach Cloudinary downloadable URL with `isDownloadable: true`.
- **External Web Resource**: Attach external URL with `isDownloadable: false`.

#### Step 7: Atomic Publication
- **Endpoint**: `POST /api/admin/curriculum/chapters/:chapterId/publish`
- **Effect**: Locks chapter contents, calculates package manifest SHA-256 checksum, sets `isPublished: true`, and increments `version`. The package is now instantly discoverable by students.

---

## 3. Student Workflows (Web PWA & Mobile App)

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ 1. Online Login  │ ───►  │ 2. Browse Grades │ ───►  │ 3. Download Pkg  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
                                                               │
                                                               ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ 6. Auto-Sync     │ ◄───  │ 5. Offline Quiz  │ ◄───  │ 4. Offline Study │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Workflow B: Downloading and Studying Offline

#### Step 1: Login & Authentication Cache
- Student enters email/password.
- Authentication credentials and session tokens are cached locally (`IndexedDB` on Web, `expo-sqlite` on Mobile).
- This allows students to open and unlock the app even in airplane mode.

#### Step 2: Browse Curriculum
- Student opens the curriculum screen.
- The app displays published Grades 1–12, subjects, and available chapters.
- Chapters with downloaded packages display a green **"Available Offline"** badge with download size.

#### Step 3: One-Click Package Download
- Student taps **"Download for Offline Study"**.
- The download manager initiates a 5-step transactional pipeline:
  1. Fetch canonical `LearningPackageManifest` from `/api/student/packages/:chapterId`.
  2. Download textbook PDF chunk and compute SHA-256 checksum.
  3. Download all attached reference documents marked `isDownloadable: true`.
  4. Write quiz questions, choices, and answer keys to local storage.
  5. Commit manifest and mark status as `AVAILABLE_OFFLINE`.
- If any download fails or checksum mismatches, all partial files are rolled back, and status is set to `FAILED`.

#### Step 4: Airplane Mode Study (No Internet)
- Student boards a bus, travels to a rural parish, or toggles **"Airplane Mode"**.
- **Textbook Reader**:
  - The reader loads the locally cached PDF directly from device storage (`IndexedDB Blob` on Web, `FileSystem.documentDirectory` on Mobile).
  - Automatically restricts navigation to the chapter's clamped page range (`startPage` to `endPage`).
  - Automatically records the `lastReadPage` and marks chapter complete when reaching `endPage`.
- **References**:
  - Downloaded PDFs open instantly without network.
  - External web links show clear visual cues: *"Requires Internet Access"*.

#### Step 5: Taking Offline Practice Quizzes
- Student opens the practice quiz.
- Questions and choices render instantly from local database.
- Student answers questions and submits.
- **Local Scoring**: Immediate, encouraging feedback is calculated locally with detailed explanations in Amharic.
- **Outbox Queue**: An attempt record with unique `clientAttemptUuid` is committed to the local outbox queue (`IndexedDB` outbox on Web, `sqlite` sync queue on Mobile).

#### Step 6: Reconnection & Automatic Idempotent Sync
- When Wi-Fi or cellular network returns:
  - Both Web PWA and Mobile background sync engines detect connectivity (`online` event or network reachability).
  - The outbox flushes pending attempts and reading progress to `/api/student/sync/batch`.
  - The server validates answers against official answer keys, confirms scores, and updates `student_progress`.
  - If a network retry occurs or an interrupted request is resent, the server recognizes the `clientAttemptUuid` and returns `DUPLICATE` without creating extra rows.
  - Student progress and quiz histories stay synchronized across all devices!
