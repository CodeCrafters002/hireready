import type {
  User,
  CandidateProfile,
  Job,
  Application,
  Payment,
  AssessmentQuestion,
  InterviewSlot,
  AppNotification
} from '~/types/portal'

const SEED_FLAG = 'hr_seeded'

export function seedDemoData() {
  if (import.meta.server) return
  if (localStorage.getItem(SEED_FLAG)) return

  // ── Demo users ──────────────────────────────────────────────────────────
  const users: User[] = [
    { id: 'user-admin-1', email: 'admin@hireready.demo', name: 'Priya Sharma (Admin)', role: 'admin', passwordHash: 'demo_hash', createdAt: '2026-01-15T09:00:00Z' },
    { id: 'user-cand-1', email: 'rahul@demo.com', name: 'Rahul Mehta', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-06-10T10:00:00Z' },
    { id: 'user-cand-2', email: 'ananya@demo.com', name: 'Ananya Iyer', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-07-01T08:30:00Z' },
    { id: 'user-cand-3', email: 'vikram@demo.com', name: 'Vikram Joshi', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-08-20T14:00:00Z' },
    { id: 'user-emp-1', email: 'employer@brightstack.demo', name: 'Rohan Mehra (Hiring Partner)', role: 'employer', passwordHash: 'demo_hash', createdAt: '2026-05-01T09:00:00Z' }
  ]

  // ── Candidate profiles ──────────────────────────────────────────────────
  const profiles: CandidateProfile[] = [
    { userId: 'user-cand-1', fullName: 'Rahul Mehta', email: 'rahul@demo.com', mobile: '9876543210', city: 'Bengaluru', skills: ['JavaScript', 'Vue.js', 'TypeScript', 'CSS'], education: 'B.Tech in Computer Science — VIT Vellore, 2024', experience: '1.5 years as Frontend Intern at TechCorp', resumeFilename: 'rahul_mehta_resume.pdf', profilePhotoUrl: '', updatedAt: '2026-09-01T12:00:00Z' },
    { userId: 'user-cand-2', fullName: 'Ananya Iyer', email: 'ananya@demo.com', mobile: '9123456780', city: 'Pune', skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'], education: 'M.Tech in Software Engineering — COEP Pune, 2025', experience: '2 years at CloudNest Systems', resumeFilename: 'ananya_iyer_resume.pdf', profilePhotoUrl: '', updatedAt: '2026-09-05T10:00:00Z' },
    { userId: 'user-cand-3', fullName: 'Vikram Joshi', email: 'vikram@demo.com', mobile: '9988776655', city: 'Mumbai', skills: ['Excel', 'SQL', 'Tableau', 'Communication'], education: 'BBA — Mumbai University, 2023', experience: 'Fresher — completed internship at Apex Retail Labs', resumeFilename: '', profilePhotoUrl: '', updatedAt: '2026-09-10T14:00:00Z' }
  ]

  // ── Jobs ─────────────────────────────────────────────────────────────────
  const jobs: Job[] = [
    { id: 'frontend-developer', title: 'Frontend Developer', company: 'BrightStack Technologies', location: 'Bengaluru / Hybrid', type: 'Full-time', salary: '₹5–8 LPA', summary: 'Build clean, responsive product experiences using Vue and modern JavaScript.', description: 'You will work with a product team to turn designs into fast, accessible interfaces and improve our existing web application.', requirements: ['1+ year of frontend experience', 'JavaScript or TypeScript', 'Vue, React, or similar framework', 'Strong HTML and CSS fundamentals'], published: true, createdAt: '2026-06-01T09:00:00Z' },
    { id: 'java-backend-engineer', title: 'Java Backend Engineer', company: 'CloudNest Systems', location: 'Pune / Remote', type: 'Full-time', salary: '₹7–11 LPA', summary: 'Design reliable APIs and services for a growing B2B SaaS platform.', description: 'Join a backend team building secure, scalable services. You will own API features from design through production support.', requirements: ['2+ years with Java and Spring Boot', 'REST API development', 'SQL and relational databases', 'Git and code review experience'], published: true, createdAt: '2026-06-15T09:00:00Z' },
    { id: 'business-analyst', title: 'Business Analyst', company: 'Apex Retail Labs', location: 'Mumbai', type: 'Full-time', salary: '₹4–7 LPA', summary: 'Turn business questions into useful reports, requirements, and decisions.', description: 'You will partner with operational teams, document requirements, and deliver clear analysis that improves customer and business outcomes.', requirements: ['Strong Excel or Google Sheets skills', 'Clear written communication', 'Basic SQL is a plus', 'Comfort working with stakeholders'], published: true, createdAt: '2026-07-01T09:00:00Z' },
    { id: 'qa-engineer', title: 'QA Engineer', company: 'Finbox Solutions', location: 'Hyderabad / Hybrid', type: 'Full-time', salary: '₹4–6 LPA', summary: 'Help ship trusted financial software through thoughtful manual and automated testing.', description: 'You will create test plans, report issues clearly, and partner with engineers to make releases safer and faster.', requirements: ['Knowledge of software testing basics', 'Attention to detail', 'API testing experience is helpful', 'Good communication skills'], published: true, createdAt: '2026-07-15T09:00:00Z' },
    { id: 'devops-engineer', title: 'DevOps Engineer', company: 'InfraEdge Solutions', location: 'Remote', type: 'Full-time', salary: '₹8–14 LPA', summary: 'Build and maintain CI/CD pipelines, cloud infrastructure, and deployment automation.', description: 'You will own the deployment pipeline end-to-end, manage Kubernetes clusters, and work with engineering teams to improve developer experience.', requirements: ['AWS or GCP experience', 'Docker and Kubernetes', 'CI/CD tools (GitHub Actions, Jenkins)', 'Linux system administration'], published: true, createdAt: '2026-08-01T09:00:00Z' },
    { id: 'data-analyst-draft', title: 'Data Analyst', company: 'Metric Labs', location: 'Delhi NCR', type: 'Full-time', salary: '₹5–9 LPA', summary: 'Analyse datasets to uncover business insights and build dashboards.', description: 'Work with product and marketing teams to track KPIs and identify growth opportunities through data storytelling.', requirements: ['SQL proficiency', 'Python or R basics', 'Data visualisation tools (Tableau, Power BI)', 'Analytical mindset'], published: false, createdAt: '2026-09-01T09:00:00Z' }
  ]

  // ── Applications ────────────────────────────────────────────────────────
  const applications: Application[] = [
    { id: 'app-1001', jobId: 'frontend-developer', candidateId: 'user-cand-1', candidateName: 'Rahul Mehta', email: 'rahul@demo.com', phone: '9876543210', status: 'interview_scheduled', paymentAmount: 1000, assessmentScore: 80, interviewSlot: 'Tuesday, 4:00 PM', createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-09-20T15:00:00Z' },
    { id: 'app-1002', jobId: 'java-backend-engineer', candidateId: 'user-cand-2', candidateName: 'Ananya Iyer', email: 'ananya@demo.com', phone: '9123456780', status: 'mcq_pending', paymentAmount: 1000, createdAt: '2026-08-15T11:00:00Z', updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'app-1003', jobId: 'business-analyst', candidateId: 'user-cand-3', candidateName: 'Vikram Joshi', email: 'vikram@demo.com', phone: '9988776655', status: 'payment_pending', paymentAmount: 1000, createdAt: '2026-09-10T14:30:00Z', updatedAt: '2026-09-10T14:30:00Z' },
    { id: 'app-1004', jobId: 'qa-engineer', candidateId: 'user-cand-1', candidateName: 'Rahul Mehta', email: 'rahul@demo.com', phone: '9876543210', status: 'submitted_to_client', paymentAmount: 1000, assessmentScore: 100, interviewSlot: 'Wednesday, 11:00 AM', interviewFeedback: 'Strong communication, solid testing concepts.', createdAt: '2026-07-20T09:00:00Z', updatedAt: '2026-09-25T12:00:00Z' }
  ]

  // ── Payments ────────────────────────────────────────────────────────────
  const payments: Payment[] = [
    { id: 'pay-1001', applicationId: 'app-1001', candidateId: 'user-cand-1', amount: 1000, status: 'paid', method: 'Demo payment', paidAt: '2026-08-01T10:05:00Z', createdAt: '2026-08-01T10:05:00Z' },
    { id: 'pay-1002', applicationId: 'app-1002', candidateId: 'user-cand-2', amount: 1000, status: 'paid', method: 'Demo payment', paidAt: '2026-08-15T11:10:00Z', createdAt: '2026-08-15T11:10:00Z' },
    { id: 'pay-1003', applicationId: 'app-1003', candidateId: 'user-cand-3', amount: 1000, status: 'pending', method: 'Demo payment', createdAt: '2026-09-10T14:30:00Z' },
    { id: 'pay-1004', applicationId: 'app-1004', candidateId: 'user-cand-1', amount: 1000, status: 'paid', method: 'Demo payment', paidAt: '2026-07-20T09:05:00Z', createdAt: '2026-07-20T09:05:00Z' }
  ]

  // ── MCQ questions ───────────────────────────────────────────────────────
  const questions: AssessmentQuestion[] = [
    // ── Frontend Developer specific questions ────────────────────────────
    { id: 'q-fe-001', question: 'Which HTML element is most appropriate for the main page content?', options: ['<main>', '<section>', '<aside>', '<article>'], correctIndex: 0, enabled: true, category: 'HTML', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-002', question: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Computer Style Syntax', 'Creative Style System', 'Custom Sheet Styles'], correctIndex: 0, enabled: true, category: 'CSS', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-003', question: 'In Vue 3, what is the Composition API\'s equivalent of data()?', options: ['reactive() or ref()', 'computed()', 'watch()', 'props'], correctIndex: 0, enabled: true, category: 'Vue.js', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-004', question: 'Which CSS property controls the space inside an element\'s border?', options: ['margin', 'border-spacing', 'padding', 'outline'], correctIndex: 2, enabled: true, category: 'CSS', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-005', question: 'Which JavaScript method is used to fetch data from an API asynchronously?', options: ['setTimeout()', 'fetch()', 'querySelector()', 'addEventListener()'], correctIndex: 1, enabled: true, category: 'JavaScript', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-006', question: 'What is the purpose of a CSS media query?', options: ['Fetch images from a CDN', 'Apply styles based on screen size', 'Query the DOM', 'Load fonts asynchronously'], correctIndex: 1, enabled: true, category: 'CSS', createdAt: '2026-02-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },
    { id: 'q-fe-007', question: 'Which hook in React is used to run code after render?', options: ['useState', 'useContext', 'useEffect', 'useMemo'], correctIndex: 2, enabled: true, category: 'React', createdAt: '2026-02-01T00:00:00Z', jobId: 'frontend-developer', jobTitle: 'Frontend Developer' },

    // ── Java Backend Engineer specific questions ──────────────────────────
    { id: 'q-be-001', question: 'Which HTTP method is commonly used to create a resource?', options: ['GET', 'POST', 'DELETE', 'PATCH'], correctIndex: 1, enabled: true, category: 'REST API', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },
    { id: 'q-be-002', question: 'What is the purpose of a foreign key in a relational database?', options: ['Encrypt data', 'Link two tables together', 'Auto-increment IDs', 'Store metadata'], correctIndex: 1, enabled: true, category: 'Database', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },
    { id: 'q-be-003', question: 'In Spring Boot, which annotation marks a class as a REST controller?', options: ['@Component', '@Service', '@RestController', '@Entity'], correctIndex: 2, enabled: true, category: 'Spring Boot', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },
    { id: 'q-be-004', question: 'Which data structure uses FIFO ordering?', options: ['Stack', 'Queue', 'Tree', 'Hash Map'], correctIndex: 1, enabled: true, category: 'Data Structures', createdAt: '2026-02-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },
    { id: 'q-be-005', question: 'What does ORM stand for in the context of databases?', options: ['Object Relational Mapping', 'Open Resource Manager', 'Object Request Model', 'Ordered Relational Method'], correctIndex: 0, enabled: true, category: 'Database', createdAt: '2026-02-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },
    { id: 'q-be-006', question: 'Which HTTP status code means "Resource Not Found"?', options: ['200', '401', '404', '500'], correctIndex: 2, enabled: true, category: 'REST API', createdAt: '2026-02-01T00:00:00Z', jobId: 'java-backend-engineer', jobTitle: 'Java Backend Engineer' },

    // ── Business Analyst specific questions ──────────────────────────────
    { id: 'q-ba-001', question: 'What is the best first action when requirements are unclear?', options: ['Assume missing details', 'Ask clarifying questions', 'Ignore it', 'Start coding immediately'], correctIndex: 1, enabled: true, category: 'Requirements', createdAt: '2026-01-01T00:00:00Z', jobId: 'business-analyst', jobTitle: 'Business Analyst' },
    { id: 'q-ba-002', question: 'In Excel, which function is used to look up a value in a table?', options: ['SUMIF', 'VLOOKUP', 'COUNTIF', 'CONCAT'], correctIndex: 1, enabled: true, category: 'Excel', createdAt: '2026-01-01T00:00:00Z', jobId: 'business-analyst', jobTitle: 'Business Analyst' },
    { id: 'q-ba-003', question: 'What does KPI stand for?', options: ['Key Performance Indicator', 'Key Project Initiative', 'Known Problem Index', 'Knowledge Process Integration'], correctIndex: 0, enabled: true, category: 'Business', createdAt: '2026-02-01T00:00:00Z', jobId: 'business-analyst', jobTitle: 'Business Analyst' },
    { id: 'q-ba-004', question: 'What is the purpose of a stakeholder analysis?', options: ['To write test cases', 'To identify people affected by a project', 'To model database schemas', 'To deploy software'], correctIndex: 1, enabled: true, category: 'Business Analysis', createdAt: '2026-02-01T00:00:00Z', jobId: 'business-analyst', jobTitle: 'Business Analyst' },
    { id: 'q-ba-005', question: 'In agile, what is a "sprint"?', options: ['A bug-fix session', 'A time-boxed iteration', 'A deployment pipeline', 'A design review'], correctIndex: 1, enabled: true, category: 'Agile', createdAt: '2026-03-01T00:00:00Z', jobId: 'business-analyst', jobTitle: 'Business Analyst' },

    // ── QA Engineer specific questions ───────────────────────────────────
    { id: 'q-qa-001', question: 'What does "regression testing" verify?', options: ['New features only', 'Previously working features still work after changes', 'API response times', 'Database indexes'], correctIndex: 1, enabled: true, category: 'Testing', createdAt: '2026-01-01T00:00:00Z', jobId: 'qa-engineer', jobTitle: 'QA Engineer' },
    { id: 'q-qa-002', question: 'Which testing type checks individual functions in isolation?', options: ['Integration testing', 'End-to-end testing', 'Unit testing', 'Load testing'], correctIndex: 2, enabled: true, category: 'Testing', createdAt: '2026-01-01T00:00:00Z', jobId: 'qa-engineer', jobTitle: 'QA Engineer' },
    { id: 'q-qa-003', question: 'What is a "bug" in software testing?', options: ['A missing feature', 'A deviation from expected behaviour', 'A user complaint', 'A slow network'], correctIndex: 1, enabled: true, category: 'Testing', createdAt: '2026-02-01T00:00:00Z', jobId: 'qa-engineer', jobTitle: 'QA Engineer' },
    { id: 'q-qa-004', question: 'Which tool is commonly used for API testing?', options: ['Photoshop', 'Postman', 'Excel', 'Git'], correctIndex: 1, enabled: true, category: 'API Testing', createdAt: '2026-02-01T00:00:00Z', jobId: 'qa-engineer', jobTitle: 'QA Engineer' },
    { id: 'q-qa-005', question: 'What does "test coverage" measure?', options: ['How fast tests run', 'The percentage of code exercised by tests', 'The number of testers in a team', 'How many bugs are open'], correctIndex: 1, enabled: true, category: 'Testing', createdAt: '2026-03-01T00:00:00Z', jobId: 'qa-engineer', jobTitle: 'QA Engineer' },

    // ── DevOps Engineer specific questions ───────────────────────────────
    { id: 'q-do-001', question: 'What does CI/CD stand for?', options: ['Compile & Integrate / Code Deploy', 'Continuous Integration / Continuous Deployment', 'Check In / Check Done', 'Cloud Infrastructure / Cloud Database'], correctIndex: 1, enabled: true, category: 'DevOps', createdAt: '2026-01-01T00:00:00Z', jobId: 'devops-engineer', jobTitle: 'DevOps Engineer' },
    { id: 'q-do-002', question: 'What is a Docker container?', options: ['A virtual machine', 'A lightweight isolated runtime environment', 'A cloud database', 'A monitoring tool'], correctIndex: 1, enabled: true, category: 'Docker', createdAt: '2026-01-01T00:00:00Z', jobId: 'devops-engineer', jobTitle: 'DevOps Engineer' },
    { id: 'q-do-003', question: 'What is Kubernetes primarily used for?', options: ['Writing code', 'Container orchestration and scheduling', 'UI testing', 'Database backups'], correctIndex: 1, enabled: true, category: 'Kubernetes', createdAt: '2026-02-01T00:00:00Z', jobId: 'devops-engineer', jobTitle: 'DevOps Engineer' },
    { id: 'q-do-004', question: 'Which command checks the status of a Linux service?', options: ['ls -la', 'systemctl status <service>', 'ping localhost', 'chmod 755'], correctIndex: 1, enabled: true, category: 'Linux', createdAt: '2026-02-01T00:00:00Z', jobId: 'devops-engineer', jobTitle: 'DevOps Engineer' },
    { id: 'q-do-005', question: 'What is an IAM role in AWS?', options: ['A billing plan', 'A permission set for AWS resources', 'A virtual network', 'A database engine'], correctIndex: 1, enabled: true, category: 'AWS', createdAt: '2026-03-01T00:00:00Z', jobId: 'devops-engineer', jobTitle: 'DevOps Engineer' },

    // ── Global / fallback questions (no jobId) ───────────────────────────
    { id: 'q-g-001', question: 'What does API stand for?', options: ['Application Programming Interface', 'Applied Program Integration', 'Advanced Page Interaction', 'Application Process Index'], correctIndex: 0, enabled: true, category: 'General', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'q-g-002', question: 'Which command initialises a new Git repository?', options: ['git start', 'git init', 'git new', 'git create'], correctIndex: 1, enabled: true, category: 'Git', createdAt: '2026-03-01T00:00:00Z' },
    { id: 'q-g-003', question: 'Which practice makes passwords safer?', options: ['Reuse one password', 'Share it with a teammate', 'Use a password manager', 'Save it in public notes'], correctIndex: 2, enabled: true, category: 'Security', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'q-g-004', question: 'What is the purpose of version control?', options: ['Speed up code execution', 'Track and manage code changes over time', 'Compress files', 'Monitor server uptime'], correctIndex: 1, enabled: true, category: 'Git', createdAt: '2026-02-01T00:00:00Z' },
    { id: 'q-g-005', question: 'Which is NOT a pillar of OOP?', options: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Compilation'], correctIndex: 3, enabled: true, category: 'Programming', createdAt: '2026-03-01T00:00:00Z' }
  ]

  // ── Interview slots ─────────────────────────────────────────────────────
  const slots: InterviewSlot[] = [
    { id: 'slot-001', date: '2026-10-01', time: '10:00 AM', available: true },
    { id: 'slot-002', date: '2026-10-01', time: '02:00 PM', available: true },
    { id: 'slot-003', date: '2026-10-02', time: '11:00 AM', available: true },
    { id: 'slot-004', date: '2026-10-02', time: '04:00 PM', available: true },
    { id: 'slot-005', date: '2026-10-03', time: '09:30 AM', available: true },
    { id: 'slot-006', date: '2026-09-20', time: '04:00 PM', available: false, bookedBy: 'user-cand-1', applicationId: 'app-1001' },
    { id: 'slot-007', date: '2026-09-25', time: '11:00 AM', available: false, bookedBy: 'user-cand-1', applicationId: 'app-1004' }
  ]

  // ── Notifications ───────────────────────────────────────────────────────
  const notifications: AppNotification[] = [
    { id: 'notif-001', userId: 'user-cand-1', type: 'payment', title: 'Payment confirmed', message: 'Your ₹1,000 demo payment for Frontend Developer was successful.', read: true, createdAt: '2026-08-01T10:05:00Z' },
    { id: 'notif-002', userId: 'user-cand-1', type: 'assessment', title: 'MCQ passed', message: 'You scored 80% on the Frontend Developer assessment.', read: true, createdAt: '2026-08-05T14:00:00Z' },
    { id: 'notif-003', userId: 'user-cand-1', type: 'interview', title: 'Interview scheduled', message: 'Your mock interview is booked for Tuesday, 4:00 PM.', read: false, createdAt: '2026-09-18T10:00:00Z' },
    { id: 'notif-004', userId: 'user-cand-1', type: 'selection', title: 'Profile submitted', message: 'Your profile for QA Engineer has been submitted to Finbox Solutions.', read: false, createdAt: '2026-09-25T12:00:00Z' },
    { id: 'notif-005', userId: 'user-cand-2', type: 'payment', title: 'Payment confirmed', message: 'Your ₹1,000 demo payment for Java Backend Engineer was successful.', read: true, createdAt: '2026-08-15T11:10:00Z' },
    { id: 'notif-006', userId: 'user-cand-3', type: 'general', title: 'Welcome to HireReady', message: 'Complete your profile and start applying for jobs.', read: false, createdAt: '2026-09-10T14:30:00Z' }
  ]

  // ── Write to localStorage ───────────────────────────────────────────────
  localStorage.setItem('hr_users', JSON.stringify(users))
  localStorage.setItem('hr_profiles', JSON.stringify(profiles))
  localStorage.setItem('hr_jobs', JSON.stringify(jobs))
  localStorage.setItem('hr_applications', JSON.stringify(applications))
  localStorage.setItem('hr_payments', JSON.stringify(payments))
  localStorage.setItem('hr_questions', JSON.stringify(questions))
  localStorage.setItem('hr_attempts', JSON.stringify([]))
  localStorage.setItem('hr_interview_slots', JSON.stringify(slots))
  localStorage.setItem('hr_interview_feedback', JSON.stringify([]))
  localStorage.setItem('hr_notifications', JSON.stringify(notifications))
  localStorage.setItem(SEED_FLAG, 'true')
}
