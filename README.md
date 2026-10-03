# HireReady — Job Portal

A **qualification-first job portal** built with [Nuxt 4](https://nuxt.com/), [Nuxt UI](https://ui.nuxt.com/), and [Tailwind CSS](https://tailwindcss.com/).

Candidates complete **payment → MCQ assessment → mock interview** before their verified profile reaches employers.

---

## Quick Start

```bash
pnpm install
pnpm dev
```

Open **http://localhost:3000** in your browser.

> **Important:** Use `pnpm` (not `npm`) — the project uses a pnpm lockfile.

---

## Demo Accounts

All data is stored in **localStorage** — no backend or database required.  
On first visit, the app auto-seeds realistic demo data.

| Role      | Name                | Email                    | Password     |
| --------- | ------------------- | ------------------------ | ------------ |
| Admin     | Priya Sharma        | `admin@hireready.demo`   | any password |
| Candidate | Rahul Mehta         | `rahul@demo.com`         | any password |
| Candidate | Ananya Iyer         | `ananya@demo.com`        | any password |
| Candidate | Vikram Joshi        | `vikram@demo.com`        | any password |
| Employer  | Rohan Mehra         | `employer@brightstack.demo` | any password |

> **Demo mode:** Any password is accepted. No real credentials are stored.

---

## Testing Each Dashboard

### Candidate Dashboard (`/candidate`)

1. Go to `/auth/sign-in` and click a candidate demo button (e.g. "Candidate — Rahul").
2. Enter any password and sign in.
3. Explore:
   - **Dashboard** — Stats overview, recent applications, profile completion alert.
   - **Profile** — Edit name, email, mobile, city, skills, education, experience, and résumé (demo upload).
   - **My Applications** — Status timeline for each application.
   - **Assessments** — Past MCQ scores.
   - **Interviews** — Booked interviews, reviewer feedback.
   - **Notifications** — Payment, assessment, interview, and selection updates.

### Admin Dashboard (`/admin`)

1. Go to `/auth/sign-in` and click "Admin — Priya".
2. Enter any password and sign in.
3. Explore:
   - **Dashboard** — Summary cards linking to each section.
   - **Manage Jobs** — Create, edit, publish/unpublish, delete jobs.
   - **Manage Candidates** — View candidate profiles, skills, résumé, application history.
   - **Applications** — Filter by status, update any application's status via dropdown.
   - **Payments** — Mark demo payments as paid/refunded.
   - **MCQ Questions** — Add, edit, delete, enable/disable questions.
   - **MCQ Results** — View all assessment submissions and scores.
   - **Interview Slots** — Create/delete available slots, add pass/fail feedback for booked interviews.

### Employer / Client Dashboard (`/employer`)

1. Go to `/auth/sign-in` and click "Employer — Rohan".
2. Enter any password and sign in.
3. Explore:
   - **Dashboard** — Pipeline overview of pre-vetted candidates who passed both MCQ and Mock Interview and were submitted by Admin.
   - **Review Candidates** — View candidate scores, technical reviewer feedback, skills, and resume.
   - **Decision Controls** — Click "Make Offer / Select" or "Pass / Reject", which instantly notifies the candidate.

### Public Pages

- **Home (`/`)** — Hero section, featured jobs, and "your path to the client" steps.
- **Jobs (`/jobs`)** — Browse and search all published jobs.
- **Job Detail (`/jobs/[id]`)** — Full job description with application process sidebar.
- **Apply (`/jobs/[id]/apply`)** — Pre-fills from your profile if signed in.
- **Application Progress (`/application/[id]`)** — Step-by-step flow through payment → MCQ → interview → client review.
- **MCQ Assessment (`/assessments/[id]`)** — 5 questions, 60% pass threshold.

### Full Application Flow (End-to-End)

1. Sign in as a candidate.
2. Browse `/jobs` and click "View & apply" on a job.
3. Fill in details (pre-filled if signed in) → "Continue to payment".
4. Click "Pay ₹1,000 — demo" (demo payment).
5. Take the MCQ assessment → need 60% to pass.
6. Book a mock interview slot.
7. Sign out, sign in as admin.
8. Go to Admin → Interview Slots → Add feedback (pass/fail).
9. Go to Admin → Applications → Update status to "Submitted to Client".
10. Sign back in as the candidate to see notifications and updated status.

---

## Resetting Demo Data

Clear your browser's localStorage for `localhost:3000`:

- **Chrome:** DevTools → Application → Local Storage → right-click → Clear
- Or run in the console: `localStorage.clear(); location.reload();`

---

## Architecture

### Data Layer

All data is managed through a single composable: `useDataStore()` (`app/composables/useDataStore.ts`).

This composable wraps all CRUD operations around `localStorage` with simple `read<T>()` / `write<T>()` helpers. To migrate to MongoDB + server APIs:

1. Replace each function in `useDataStore` with a `$fetch('/api/...')` call.
2. The pages and components don't need to change — they only call `useDataStore()`.

### TypeScript Interfaces

All data types are in `app/types/portal.ts`:

- `User`, `CandidateProfile`, `Job`, `Application`, `Payment`
- `AssessmentQuestion`, `AssessmentAttempt`
- `InterviewSlot`, `InterviewFeedback`
- `AppNotification`

### Route Protection

Global middleware (`app/middleware/auth.global.ts`) enforces:

- `/candidate/*` → requires `candidate` role
- `/admin/*` → requires `admin` role
- Unauthenticated users are redirected to `/auth/sign-in`

### Layouts

- `default.vue` — Public pages with header/footer
- `candidate.vue` — Sidebar dashboard for candidates
- `admin.vue` — Sidebar dashboard for admins

---

## Tech Stack

- **Nuxt 4** (Vue 3, Nitro, Vite)
- **Nuxt UI 4** (component library)
- **Tailwind CSS 4**
- **TypeScript**
- **localStorage** (demo data persistence)

---

## License

MIT
