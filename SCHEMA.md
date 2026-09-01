# Online Exam System V2 - Firestore Database Schema

## Collections Hierarchy

```text
users/                                  # Teacher profiles
  └── {uid}

exams/                                  # Examination metadata & settings
  └── {examId}
        ├── students/                   # Allowed student roster
        │     └── {studentId}
        ├── questions/                  # Questions (Without answer keys)
        │     └── {questionId}
        └── answerKeys/                 # Teacher-only / Server answer keys
              └── {questionId}

attempts/                               # Student examination attempts
  └── {attemptId}
        ├── answers/                    # Submitted answers per question
        │     └── {questionId}
        └── violations/                 # Anti-cheat / Proctoring audit records
              └── {violationId}

auditLogs/                              # Administrative audit trails
  └── {logId}
```

---

## Document Definitions

### 1. `users/{uid}`
```json
{
  "uid": "teacher_123",
  "email": "teacher@example.com",
  "fullName": "Prof. Juan Dela Cruz",
  "role": "teacher",
  "active": true,
  "createdAt": "2026-09-01T10:00:00.000Z"
}
```

### 2. `exams/{examId}`
```json
{
  "id": "exam_midterm_2026",
  "teacherUid": "teacher_123",
  "title": "Midterm Examination in Computer Programming",
  "course": "CS 101 - Introduction to Programming",
  "section": "BSIT 1A",
  "examCode": "CP-MID-2026",
  "timerMode": "per_question",
  "timerSeconds": 60,
  "randomizeQuestions": false,
  "randomizeChoices": false,
  "violationDeduction": 1,
  "maxViolations": 3,
  "retakePolicy": "ONE_ATTEMPT",
  "status": "OPEN",
  "totalPoints": 50,
  "questionCount": 50,
  "studentCount": 42,
  "showScoreImmediately": true,
  "createdAt": "2026-09-01T10:00:00.000Z",
  "updatedAt": "2026-09-01T10:00:00.000Z"
}
```

### 3. `exams/{examId}/students/{studentId}`
```json
{
  "studentId": "2026-001",
  "fullName": "Juan Dela Cruz",
  "eligible": true,
  "addedAt": "2026-09-01T10:00:00.000Z"
}
```

### 4. `exams/{examId}/questions/{questionId}`
```json
{
  "id": "q_1_abc",
  "number": 1,
  "type": "MCQ",
  "questionText": "Which keyword is used to declare a constant in JavaScript?",
  "options": {
    "A": "var",
    "B": "let",
    "C": "const",
    "D": "constant"
  },
  "points": 1
}
```

### 5. `exams/{examId}/answerKeys/{questionId}`
```json
{
  "questionId": "q_1_abc",
  "answer": "C",
  "points": 1
}
```

### 6. `attempts/{attemptId}`
```json
{
  "id": "att_789",
  "examId": "exam_midterm_2026",
  "studentId": "2026-001",
  "studentName": "Juan Dela Cruz",
  "status": "SUBMITTED",
  "currentQuestionIndex": 50,
  "startedAt": "2026-09-01T10:15:00.000Z",
  "finishedAt": "2026-09-01T10:45:00.000Z",
  "rawScore": 45,
  "maxScore": 50,
  "deduction": 2,
  "finalScore": 43,
  "percentage": 86,
  "violationCount": 2,
  "answersSubmitted": 50
}
```

### 7. `attempts/{attemptId}/answers/{questionId}`
```json
{
  "questionId": "q_1_abc",
  "questionNumber": 1,
  "answer": "C",
  "submittedAt": "2026-09-01T10:15:35.000Z",
  "timeUsed": 35,
  "isCorrect": true,
  "pointsAwarded": 1
}
```

### 8. `attempts/{attemptId}/violations/{violationId}`
```json
{
  "id": "v_101",
  "attemptId": "att_789",
  "studentId": "2026-001",
  "type": "TAB_SWITCH",
  "timestamp": "2026-09-01T10:22:15.000Z",
  "sequence": 1,
  "details": "Student switched tabs or minimized the browser window"
}
```
