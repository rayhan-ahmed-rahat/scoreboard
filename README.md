# The Tech Academy Scoreboard

A production-ready React + Vite + Firebase app for student scoring, role-based points management, audit-safe history, reporting, CSV workflows, and rankings.

## What is included

- Firebase Authentication with email/password login
- Role support with `admin` and `teacher`
- Admin-only student, category, batch, and role management
- Teacher-safe scoring flow for add/deduct actions only
- Full `score_logs` audit trail for every adjustment
- Batch creation and management
- Student CSV import
- Leaderboard CSV export
- Score log CSV export
- Reports with date range filters
- Student list pagination
- Dark mode toggle
- Improved loading, empty, and error states
- Vercel-ready routing

## Tech stack

- React
- Vite
- Firebase Authentication
- Cloud Firestore
- Plain CSS

## Project structure

```text
tech-academy-scoreboard/
├── firebase/
│   ├── demo-data.json
│   └── firestore.rules
├── public/
├── src/
│   ├── app/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── scores/
│   │   └── students/
│   ├── contexts/
│   ├── firebase/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   ├── utils/
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── vercel.json
└── vite.config.js
```

## Setup

### 1. Create Firebase project

1. Create a new project in [Firebase Console](https://console.firebase.google.com/).
2. Add a web app.
3. Enable `Email/Password` in Authentication.
4. Create at least one login account in Firebase Authentication.
5. Create a Firestore database.
6. Copy the rules from [firebase/firestore.rules](./firebase/firestore.rules) into Firestore Rules.

### 2. Add environment variables

Create `.env` in the project root:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Build

```bash
npm run build
```

## Roles

The app supports:

- `teacher`
- `admin`

### Permissions

- Teachers can:
  - log in
  - view students, reports, leaderboard, categories, and batches
  - add or deduct points
  - view full score history
- Admins can also:
  - add, edit, and delete students
  - add, edit, and delete categories
  - add, edit, and delete batches
  - import students from CSV
  - promote or demote users between `teacher` and `admin`
  - load demo data

### Important first-admin note

New users are created as `teacher` automatically on first login.

To create your first admin, update that user's document in Firestore manually:

```json
{
  "role": "admin"
}
```

After that, admins can manage roles from the Settings page.

## Firestore collections

- `users`
- `students`
- `categories`
- `batches`
- `score_logs`
- `settings`

### Student document

```json
{
  "name": "Ariana Khan",
  "studentId": "TA-1001",
  "age": 15,
  "school": "Dhaka Central School",
  "batch": "firestoreBatchId",
  "status": "active",
  "notes": "Strong project participation",
  "totalScore": 25,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Score log document

```json
{
  "studentRef": "firestoreStudentDocId",
  "studentId": "TA-1001",
  "studentName": "Ariana Khan",
  "categoryId": "firestoreCategoryDocId",
  "categoryName": "Attendance",
  "points": 10,
  "type": "add",
  "reason": "Perfect attendance this week",
  "teacherName": "Teacher One",
  "teacherEmail": "teacher@techacademy.com",
  "createdAt": "timestamp"
}
```

### Batch document

```json
{
  "name": "Batch A",
  "code": "BATCH-A",
  "description": "Morning coding group",
  "status": "active",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## CSV import format

Admins can import students from CSV on the Students page.

Expected headers:

```text
name,studentId,age,school,batchCode,status,notes
```

Example row:

```text
Ariana Khan,TA-1001,15,Dhaka Central School,BATCH-A,active,Strong project participation
```

The `batchCode` must match an existing batch.

## Safety rules in the app

- Every score change writes a new document to `score_logs`
- Teachers cannot update full student records directly
- Score totals are updated through a Firestore transaction
- Score history is immutable from the app
- Role-based Firestore rules protect writes by collection and action type

## Demo data

Use the `Load demo data` button on the Settings page as an admin, or review the example payload in [firebase/demo-data.json](./firebase/demo-data.json).

## Recommended Firestore indexes

Firestore may prompt you to create composite indexes. A useful one for this app is:

- `score_logs`: `studentRef` ascending, `createdAt` descending

## Deploy to Vercel

1. Push the project to GitHub.
2. Import it into [Vercel](https://vercel.com/).
3. Add the same Firebase environment variables from your local `.env`.
4. Deploy.

The included [vercel.json](./vercel.json) keeps React routes working on refresh.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
