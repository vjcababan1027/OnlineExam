# Online Exam System V2 🎓

A modern, high-performance, and resilient online examination platform built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase / Firestore**.

---

## ⚡ Key Features

- 👨‍🏫 **Teacher Workflow**:
  - **Bulk Student Import**: Copy & paste `Student ID <TAB> Full Name` straight from Google Sheets / Excel with automatic duplicate & validation previews.
  - **Bulk Question Import**: Paste pipe-delimited questions (`NUMBER | TYPE | QUESTION_TEXT | OPTION_A | OPTION_B | OPTION_C | OPTION_D | ANSWER_KEY | POINTS`) with automatic separation into secure teacher-only `answerKeys`.
  - **Live Results Dashboard**: Real-time stats (Class Average, Highest, Lowest, Submitted, In Progress) with auto-updating student roster table.
  - **Multi-Sheet XLSX & CSV Export**: Download comprehensive Excel workbooks with Summary Results, Item Analysis (Student Answers), and Proctoring Violation Audit Logs via SheetJS.
  - **Student Attempt Inspector**: Deep-dive into individual student answer choices vs correct answers and review timestamped proctoring violations.

- 👨‍🎓 **Student Workflow**:
  - **Frictionless Login**: Enter `Exam Code` + `Student ID` (no passwords needed).
  - **Timed Runner**: Per-question countdown timers with auto-submit on 00:00 (or whole-exam duration).
  - **Sequential Single-Question Mode**: No back button to prevent leaks.
  - **Anti-Cheat Proctoring**: Monitors tab switches, lost window focus, and fullscreen exits with point penalties and auto-lock thresholds.
  - **Instant Results**: Score breakdown with percentage, raw score, deductions, and confetti celebration (configurable by instructor).

- 🛡️ **Architecture & Security**:
  - **Dual-Mode Data Engine**: Works out-of-the-box in local reactive demo mode and connects to live Firebase/Firestore with environment variables.
  - **Firestore Security Rules**: Complete protection preventing students from reading `answerKeys` or altering scores.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
To connect your live Firebase project, create `.env.local` based on `.env.example`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```
*(If left empty, the application runs in local reactive mode with pre-seeded demo data)*

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Default Preloaded Demo Credentials

- **Teacher Dashboard**: [http://localhost:3000/teacher/dashboard](http://localhost:3000/teacher/dashboard)
  - Instructor: `Prof. Juan Dela Cruz` (`teacher@example.com`)
- **Student Exam Portal**: [http://localhost:3000/exam/login](http://localhost:3000/exam/login)
  - Exam Code: `CP-MID-2026`
  - Student ID: `2026-001` (Juan Dela Cruz)
