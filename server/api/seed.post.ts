import { connectDB } from '~~/server/utils/db'
import {
  UserModel,
  CandidateProfileModel,
  JobModel,
  ApplicationModel,
  AssessmentQuestionModel
} from '~~/server/models'

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event).catch(() => ({}))
  const force = body?.force === true

  const existingJobsCount = await JobModel.countDocuments()

  if (existingJobsCount > 0 && !force) {
    return {
      success: true,
      message: 'Database already has data. Pass { force: true } to re-seed.',
      counts: {
        jobs: existingJobsCount,
        users: await UserModel.countDocuments(),
        applications: await ApplicationModel.countDocuments(),
        questions: await AssessmentQuestionModel.countDocuments()
      }
    }
  }

  // 1. Seed Users
  const users = [
    { id: 'user-admin-1', email: 'admin@hireready.demo', name: 'Priya Sharma (Admin)', role: 'admin', passwordHash: 'demo_hash', createdAt: '2026-01-15T09:00:00Z' },
    { id: 'user-cand-1', email: 'rahul@demo.com', name: 'Rahul Mehta', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-06-10T10:00:00Z' },
    { id: 'user-cand-2', email: 'ananya@demo.com', name: 'Ananya Iyer', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-07-01T08:30:00Z' },
    { id: 'user-cand-3', email: 'vikram@demo.com', name: 'Vikram Joshi', role: 'candidate', passwordHash: 'demo_hash', createdAt: '2026-08-20T14:00:00Z' },
    { id: 'user-emp-1', email: 'employer@brightstack.demo', name: 'Rohan Mehra (Hiring Partner)', role: 'employer', passwordHash: 'demo_hash', createdAt: '2026-05-01T09:00:00Z' }
  ]

  // 2. Candidate Profiles
  const profiles = [
    { userId: 'user-cand-1', fullName: 'Rahul Mehta', email: 'rahul@demo.com', mobile: '9876543210', city: 'Bengaluru', skills: ['JavaScript', 'Vue.js', 'TypeScript', 'CSS'], education: 'B.Tech in Computer Science — VIT Vellore, 2024', experience: '1.5 years as Frontend Intern at TechCorp', resumeFilename: 'rahul_mehta_resume.pdf', profilePhotoUrl: '', updatedAt: '2026-09-01T12:00:00Z' },
    { userId: 'user-cand-2', fullName: 'Ananya Iyer', email: 'ananya@demo.com', mobile: '9123456780', city: 'Pune', skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker'], education: 'M.Tech in Software Engineering — COEP Pune, 2025', experience: '2 years at CloudNest Systems', resumeFilename: 'ananya_iyer_resume.pdf', profilePhotoUrl: '', updatedAt: '2026-09-05T10:00:00Z' },
    { userId: 'user-cand-3', fullName: 'Vikram Joshi', email: 'vikram@demo.com', mobile: '9988776655', city: 'Mumbai', skills: ['Excel', 'SQL', 'Tableau', 'Communication'], education: 'BBA — Mumbai University, 2023', experience: 'Fresher — completed internship at Apex Retail Labs', resumeFilename: '', profilePhotoUrl: '', updatedAt: '2026-09-10T14:00:00Z' }
  ]

  // 3. Jobs
  const jobs = [
    { id: 'frontend-developer', title: 'Frontend Developer', company: 'BrightStack Technologies', location: 'Bengaluru / Hybrid', type: 'Full-time', salary: '₹5–8 LPA', summary: 'Build clean, responsive product experiences using Vue and modern JavaScript.', description: 'You will work with a product team to turn designs into fast, accessible interfaces and improve our existing web application.', requirements: ['1+ year of frontend experience', 'JavaScript or TypeScript', 'Vue, React, or similar framework', 'Strong HTML and CSS fundamentals'], published: true, createdAt: '2026-06-01T09:00:00Z' },
    { id: 'java-backend-engineer', title: 'Java Backend Engineer', company: 'CloudNest Systems', location: 'Pune / Remote', type: 'Full-time', salary: '₹7–11 LPA', summary: 'Design reliable APIs and services for a growing B2B SaaS platform.', description: 'Join a backend team building secure, scalable services. You will own API features from design through production support.', requirements: ['2+ years with Java and Spring Boot', 'REST API development', 'SQL and relational databases', 'Git and code review experience'], published: true, createdAt: '2026-06-15T09:00:00Z' },
    { id: 'business-analyst', title: 'Business Analyst', company: 'Apex Retail Labs', location: 'Mumbai', type: 'Full-time', salary: '₹4–7 LPA', summary: 'Turn business questions into useful reports, requirements, and decisions.', description: 'You will partner with operational teams, document requirements, and deliver clear analysis that improves customer and business outcomes.', requirements: ['Strong Excel or Google Sheets skills', 'Clear written communication', 'Basic SQL is a plus', 'Comfort working with stakeholders'], published: true, createdAt: '2026-07-01T09:00:00Z' },
    { id: 'qa-engineer', title: 'QA Engineer', company: 'Finbox Solutions', location: 'Hyderabad / Hybrid', type: 'Full-time', salary: '₹4–6 LPA', summary: 'Help ship trusted financial software through thoughtful manual and automated testing.', description: 'You will create test plans, report issues clearly, and partner with engineers to make releases safer and faster.', requirements: ['Knowledge of software testing basics', 'Attention to detail', 'API testing experience is helpful', 'Good communication skills'], published: true, createdAt: '2026-07-15T09:00:00Z' },
    { id: 'devops-engineer', title: 'DevOps Engineer', company: 'InfraEdge Solutions', location: 'Remote', type: 'Full-time', salary: '₹8–14 LPA', summary: 'Build and maintain CI/CD pipelines, cloud infrastructure, and deployment automation.', description: 'You will own the deployment pipeline end-to-end, manage Kubernetes clusters, and work with engineering teams to improve developer experience.', requirements: ['AWS or GCP experience', 'Docker and Kubernetes', 'CI/CD tools (GitHub Actions, Jenkins)', 'Linux system administration'], published: true, createdAt: '2026-08-01T09:00:00Z' },
    { id: 'data-analyst-draft', title: 'Data Analyst', company: 'Metric Labs', location: 'Delhi NCR', type: 'Full-time', salary: '₹5–9 LPA', summary: 'Analyse datasets to uncover business insights and build dashboards.', description: 'Work with product and marketing teams to track KPIs and identify growth opportunities through data storytelling.', requirements: ['SQL proficiency', 'Python or R basics', 'Data visualisation tools (Tableau, Power BI)', 'Analytical mindset'], published: false, createdAt: '2026-09-01T09:00:00Z' }
  ]

  // 4. Applications
  const applications = [
    { id: 'app-1001', jobId: 'frontend-developer', candidateId: 'user-cand-1', candidateName: 'Rahul Mehta', email: 'rahul@demo.com', phone: '9876543210', status: 'interview_scheduled', paymentAmount: 1000, assessmentScore: 80, interviewSlot: 'Tuesday, 4:00 PM', createdAt: '2026-08-01T10:00:00Z', updatedAt: '2026-09-20T15:00:00Z' },
    { id: 'app-1002', jobId: 'java-backend-engineer', candidateId: 'user-cand-2', candidateName: 'Ananya Iyer', email: 'ananya@demo.com', phone: '9123456780', status: 'mcq_pending', paymentAmount: 1000, createdAt: '2026-08-15T11:00:00Z', updatedAt: '2026-09-18T10:00:00Z' },
    { id: 'app-1003', jobId: 'business-analyst', candidateId: 'user-cand-3', candidateName: 'Vikram Joshi', email: 'vikram@demo.com', phone: '9988776655', status: 'payment_pending', paymentAmount: 1000, createdAt: '2026-09-10T14:30:00Z', updatedAt: '2026-09-10T14:30:00Z' },
    { id: 'app-1004', jobId: 'qa-engineer', candidateId: 'user-cand-1', candidateName: 'Rahul Mehta', email: 'rahul@demo.com', phone: '9876543210', status: 'submitted_to_client', paymentAmount: 1000, assessmentScore: 100, interviewSlot: 'Wednesday, 11:00 AM', interviewFeedback: 'Strong communication, solid testing concepts.', createdAt: '2026-07-20T09:00:00Z', updatedAt: '2026-09-25T12:00:00Z' }
  ]

  // 5. Assessment Questions
  const questions = [
    { id: 'q-fe-001', question: 'Which HTML element is most appropriate for the main page content?', options: ['<main>', '<section>', '<aside>', '<article>'], correctIndex: 0, enabled: true, category: 'HTML', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-002', question: 'What does CSS stand for?', options: ['Cascading Style Sheets', 'Computer Style Syntax', 'Creative Style System', 'Custom Sheet Styles'], correctIndex: 0, enabled: true, category: 'CSS', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-003', question: 'In Vue 3, what is the Composition API\'s equivalent of data()?', options: ['reactive() or ref()', 'computed()', 'watch()', 'props'], correctIndex: 0, enabled: true, category: 'Vue.js', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-004', question: 'Which CSS property controls the space inside an element\'s border?', options: ['margin', 'border-spacing', 'padding', 'outline'], correctIndex: 2, enabled: true, category: 'CSS', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-005', question: 'Which JavaScript method is used to fetch data from an API asynchronously?', options: ['setTimeout()', 'fetch()', 'querySelector()', 'addEventListener()'], correctIndex: 1, enabled: true, category: 'JavaScript', createdAt: '2026-01-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-006', question: 'What is the purpose of a CSS media query?', options: ['Fetch images from a CDN', 'Apply styles based on screen size', 'Query the DOM', 'Load fonts asynchronously'], correctIndex: 1, enabled: true, category: 'CSS', createdAt: '2026-02-01T00:00:00Z', jobId: 'frontend-developer' },
    { id: 'q-fe-007', question: 'Which hook in React is used to run code after render?', options: ['useState', 'useContext', 'useEffect', 'useMemo'], correctIndex: 2, enabled: true, category: 'React', createdAt: '2026-02-01T00:00:00Z', jobId: 'frontend-developer' },

    { id: 'q-be-001', question: 'Which HTTP method is commonly used to create a resource?', options: ['GET', 'POST', 'DELETE', 'PATCH'], correctIndex: 1, enabled: true, category: 'REST API', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer' },
    { id: 'q-be-002', question: 'What is the purpose of a foreign key in a relational database?', options: ['Encrypt data', 'Link two tables together', 'Auto-increment IDs', 'Store metadata'], correctIndex: 1, enabled: true, category: 'Database', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer' },
    { id: 'q-be-003', question: 'In Spring Boot, which annotation marks a class as a REST controller?', options: ['@Component', '@Service', '@RestController', '@Entity'], correctIndex: 2, enabled: true, category: 'Spring Boot', createdAt: '2026-01-01T00:00:00Z', jobId: 'java-backend-engineer' },
    { id: 'q-be-004', question: 'Which data structure uses FIFO ordering?', options: ['Stack', 'Queue', 'Tree', 'Hash Map'], correctIndex: 1, enabled: true, category: 'Data Structures', createdAt: '2026-02-01T00:00:00Z', jobId: 'java-backend-engineer' },

    { id: 'q-ba-001', question: 'What is the best first action when requirements are unclear?', options: ['Assume missing details', 'Ask clarifying questions', 'Ignore it', 'Start coding immediately'], correctIndex: 1, enabled: true, category: 'Requirements', createdAt: '2026-01-01T00:00:00Z', jobId: 'business-analyst' },
    { id: 'q-ba-002', question: 'In Excel, which function is used to look up a value in a table?', options: ['SUMIF', 'VLOOKUP', 'COUNTIF', 'CONCAT'], correctIndex: 1, enabled: true, category: 'Excel', createdAt: '2026-01-01T00:00:00Z', jobId: 'business-analyst' },

    { id: 'q-qa-001', question: 'What does "regression testing" verify?', options: ['New features only', 'Previously working features still work after changes', 'API response times', 'Database indexes'], correctIndex: 1, enabled: true, category: 'Testing', createdAt: '2026-01-01T00:00:00Z', jobId: 'qa-engineer' },
    { id: 'q-qa-002', question: 'Which testing type checks individual functions in isolation?', options: ['Integration testing', 'End-to-end testing', 'Unit testing', 'Load testing'], correctIndex: 2, enabled: true, category: 'Testing', createdAt: '2026-01-01T00:00:00Z', jobId: 'qa-engineer' },

    { id: 'q-do-001', question: 'What does CI/CD stand for?', options: ['Compile & Integrate / Code Deploy', 'Continuous Integration / Continuous Deployment', 'Check In / Check Done', 'Cloud Infrastructure / Cloud Database'], correctIndex: 1, enabled: true, category: 'DevOps', createdAt: '2026-01-01T00:00:00Z', jobId: 'devops-engineer' },
    { id: 'q-do-002', question: 'What is a Docker container?', options: ['A virtual machine', 'A lightweight isolated runtime environment', 'A cloud database', 'A monitoring tool'], correctIndex: 1, enabled: true, category: 'Docker', createdAt: '2026-01-01T00:00:00Z', jobId: 'devops-engineer' },

    { id: 'q-g-001', question: 'What does API stand for?', options: ['Application Programming Interface', 'Applied Program Integration', 'Advanced Page Interaction', 'Application Process Index'], correctIndex: 0, enabled: true, category: 'General', createdAt: '2026-01-01T00:00:00Z', jobId: null },
    { id: 'q-g-002', question: 'Which command initialises a new Git repository?', options: ['git start', 'git init', 'git new', 'git create'], correctIndex: 1, enabled: true, category: 'Git', createdAt: '2026-03-01T00:00:00Z', jobId: null },
    { id: 'q-g-003', question: 'Which practice makes passwords safer?', options: ['Reuse one password', 'Share it with a teammate', 'Use a password manager', 'Save it in public notes'], correctIndex: 2, enabled: true, category: 'Security', createdAt: '2026-01-01T00:00:00Z', jobId: null }
  ]

  if (force) {
    await Promise.all([
      UserModel.deleteMany({}),
      CandidateProfileModel.deleteMany({}),
      JobModel.deleteMany({}),
      ApplicationModel.deleteMany({}),
      AssessmentQuestionModel.deleteMany({})
    ])
  }

  await Promise.all([
    UserModel.insertMany(users),
    CandidateProfileModel.insertMany(profiles),
    JobModel.insertMany(jobs),
    ApplicationModel.insertMany(applications),
    AssessmentQuestionModel.insertMany(questions)
  ])

  return {
    success: true,
    message: 'MongoDB database successfully seeded with initial HireReady data!',
    counts: {
      users: users.length,
      profiles: profiles.length,
      jobs: jobs.length,
      applications: applications.length,
      questions: questions.length
    }
  }
})
