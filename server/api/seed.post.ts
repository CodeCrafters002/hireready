import { connectDB } from '~~/server/utils/db'
import {
  UserModel,
  CandidateProfileModel,
  JobModel,
  ApplicationModel,
  AssessmentQuestionModel,
  GigModel
} from '~~/server/models'

const initialGigs = [
  {
    id: 'gig-exam-invigilator-delhi',
    title: 'National Entrance Exam Invigilator / Duty Officer',
    organization: 'Apex Testing & Assessment Services',
    category: 'exam_duty',
    date: '2026-10-18',
    shiftTime: '07:30 AM – 02:30 PM (7 hrs)',
    location: 'Delhi Public School, Sector 12, RK Puram',
    city: 'New Delhi',
    dailyPay: 1800,
    openings: 12,
    filled: 3,
    description: 'Looking for verified university graduates or postgraduates to serve as exam hall invigilators for the upcoming National Merit Entrance Examination.',
    responsibilities: [
      'Verify candidate admit cards, photo identification, and biometric tokens at hall entrance',
      'Distribute test booklets and OMR sheets in strict serial sequence',
      'Maintain absolute silence and enforce test-taking integrity guidelines during the 3-hour examination window',
      'Collect and seal all answer sheets and submit to the Chief Presiding Superintendent'
    ],
    instructions: 'Report in formal business attire with original Govt ID proof. Mobile phones and smart watches must be deposited in the secure locker upon check-in at 07:15 AM.',
    escrowStatus: 'deposited',
    status: 'open',
    postedBy: 'admin',
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'gig-tech-lab-assistant-blr',
    title: 'CBT Lab Technical Proctor & Support',
    organization: 'EduTech Matrix Digital Centers',
    category: 'technical_support',
    date: '2026-10-22',
    shiftTime: '08:00 AM – 05:00 PM (Full Day)',
    location: 'Koramangala Tech Center, 5th Block',
    city: 'Bengaluru',
    dailyPay: 2200,
    openings: 8,
    filled: 2,
    description: 'Assist in conducting a Computer-Based Test (CBT) certification drive. You will help troubleshoot student workstation logins, LAN connectivity, and browser lockouts.',
    responsibilities: [
      'Perform morning terminal diagnostic checks and launch the secure testing browser',
      'Assist candidates encountering login or network resolution issues',
      'Monitor server console for workstation dropouts and ping notifications',
      'Coordinate with the regional IT nodal lead for instant workstation swap if hardware fails'
    ],
    instructions: 'B.Tech/BCA/B.Sc Computer Science students or graduates preferred. Lunch and morning refreshments will be provided at the center.',
    escrowStatus: 'deposited',
    status: 'open',
    postedBy: 'admin',
    createdAt: '2026-10-02T11:30:00Z'
  },
  {
    id: 'gig-annual-tech-summit-mumbai',
    title: 'India AI Summit Delegate & Badge Coordinator',
    organization: 'VentureScale Global Events',
    category: 'event_coordination',
    date: '2026-10-25',
    shiftTime: '08:30 AM – 06:00 PM',
    location: 'Jio World Convention Centre, BKC',
    city: 'Mumbai',
    dailyPay: 2500,
    openings: 15,
    filled: 5,
    description: 'Join the guest management operations team for India\'s flagship Artificial Intelligence Summit. Manage delegate badge scanning, VIP lounge assistance, and speaker stage management.',
    responsibilities: [
      'Manage front desk QR-code attendee check-in and issue RFID summit badges',
      'Guide international delegates and key speakers to auditorium halls',
      'Hand out conference welcome kits and coordinate panel mic runners'
    ],
    instructions: 'Smart-casual black/white dress code. All hired volunteers receive instant UPI payment upon shift check-out, plus official Event Coordination Certificate.',
    escrowStatus: 'deposited',
    status: 'open',
    postedBy: 'admin',
    createdAt: '2026-10-03T14:00:00Z'
  }
]

export default defineEventHandler(async (event) => {
  await connectDB()

  const body = await readBody(event).catch(() => ({}))
  const force = body?.force === true

  const existingGigsCount = await GigModel.countDocuments()
  if (existingGigsCount === 0) {
    await GigModel.insertMany(initialGigs)
  }

  const existingJobsCount = await JobModel.countDocuments()

  if (existingJobsCount > 0 && !force) {
    return {
      success: true,
      message: 'Database already has data. Ensured initial gigs are seeded.',
      counts: {
        jobs: existingJobsCount,
        users: await UserModel.countDocuments(),
        applications: await ApplicationModel.countDocuments(),
        questions: await AssessmentQuestionModel.countDocuments(),
        gigs: await GigModel.countDocuments()
      }
    }
  }


  // Clean up any legacy demo users from MongoDB
  await Promise.all([
    UserModel.deleteMany({
      email: {
        $in: [
          'admin@hireready.demo',
          'rahul@demo.com',
          'ananya@demo.com',
          'vikram@demo.com',
          'employer@brightstack.demo'
        ]
      }
    }),
    CandidateProfileModel.deleteMany({
      email: {
        $in: ['rahul@demo.com', 'ananya@demo.com', 'vikram@demo.com']
      }
    }),
    ApplicationModel.deleteMany({
      email: {
        $in: ['rahul@demo.com', 'ananya@demo.com', 'vikram@demo.com']
      }
    })
  ]).catch(() => null)

  // 1. Initial Users (None by default on live website - only real registered users)
  const users: any[] = []

  // 2. Candidate Profiles
  const profiles: any[] = []

  // 3. Jobs
  const jobs = [
    { id: 'frontend-developer', title: 'Frontend Developer', company: 'BrightStack Technologies', location: 'Bengaluru / Hybrid', type: 'Full-time', salary: '₹5–8 LPA', summary: 'Build clean, responsive product experiences using Vue and modern JavaScript.', description: 'You will work with a product team to turn designs into fast, accessible interfaces and improve our existing web application.', requirements: ['1+ year of frontend experience', 'JavaScript or TypeScript', 'Vue, React, or similar framework', 'Strong HTML and CSS fundamentals'], published: true, createdAt: '2026-06-01T09:00:00Z' },
    { id: 'java-backend-engineer', title: 'Java Backend Engineer', company: 'CloudNest Systems', location: 'Pune / Remote', type: 'Full-time', salary: '₹7–11 LPA', summary: 'Design reliable APIs and services for a growing B2B SaaS platform.', description: 'Join a backend team building secure, scalable services. You will own API features from design through production support.', requirements: ['2+ years with Java and Spring Boot', 'REST API development', 'SQL and relational databases', 'Git and code review experience'], published: true, createdAt: '2026-06-15T09:00:00Z' },
    { id: 'business-analyst', title: 'Business Analyst', company: 'Apex Retail Labs', location: 'Mumbai', type: 'Full-time', salary: '₹4–7 LPA', summary: 'Turn business questions into useful reports, requirements, and decisions.', description: 'You will partner with operational teams, document requirements, and deliver clear analysis that improves customer and business outcomes.', requirements: ['Strong Excel or Google Sheets skills', 'Clear written communication', 'Basic SQL is a plus', 'Comfort working with stakeholders'], published: true, createdAt: '2026-07-01T09:00:00Z' },
    { id: 'qa-engineer', title: 'QA Engineer', company: 'Finbox Solutions', location: 'Hyderabad / Hybrid', type: 'Full-time', salary: '₹4–6 LPA', summary: 'Help ship trusted financial software through thoughtful manual and automated testing.', description: 'You will create test plans, report issues clearly, and partner with engineers to make releases safer and faster.', requirements: ['Knowledge of software testing basics', 'Attention to detail', 'API testing experience is helpful', 'Good communication skills'], published: true, createdAt: '2026-07-15T09:00:00Z' },
    { id: 'devops-engineer', title: 'DevOps Engineer', company: 'InfraEdge Solutions', location: 'Remote', type: 'Full-time', salary: '₹8–14 LPA', summary: 'Build and maintain CI/CD pipelines, cloud infrastructure, and deployment automation.', description: 'You will own the deployment pipeline end-to-end, manage Kubernetes clusters, and work with engineering teams to improve developer experience.', requirements: ['AWS or GCP experience', 'Docker and Kubernetes', 'CI/CD tools (GitHub Actions, Jenkins)', 'Linux system administration'], published: true, createdAt: '2026-08-01T09:00:00Z' },
    { id: 'data-analyst-draft', title: 'Data Analyst', company: 'Metric Labs', location: 'Delhi NCR', type: 'Full-time', salary: '₹5–9 LPA', summary: 'Analyse datasets to uncover business insights and build dashboards.', description: 'Work with product and marketing teams to track KPIs and identify growth opportunities through data storytelling.', requirements: ['SQL proficiency', 'Python or R basics', 'Data visualisation tools (Tableau, Power BI)', 'Analytical mindset'], published: false, createdAt: '2026-09-01T09:00:00Z' }
  ]

  // 4. Applications (None by default - live applicants only)
  const applications: any[] = []

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
      AssessmentQuestionModel.deleteMany({}),
      GigModel.deleteMany({})
    ])
  }

  const insertTasks: Promise<any>[] = [
    JobModel.insertMany(jobs),
    AssessmentQuestionModel.insertMany(questions)
  ]
  if (existingGigsCount === 0 || force) {
    insertTasks.push(GigModel.insertMany(initialGigs))
  }
  if (users.length > 0) insertTasks.push(UserModel.insertMany(users))
  if (profiles.length > 0) insertTasks.push(CandidateProfileModel.insertMany(profiles))
  if (applications.length > 0) insertTasks.push(ApplicationModel.insertMany(applications))

  await Promise.all(insertTasks)

  return {
    success: true,
    message: 'MongoDB database successfully seeded with initial HireReady data!',
    counts: {
      users: users.length,
      profiles: profiles.length,
      jobs: jobs.length,
      applications: applications.length,
      questions: questions.length,
      gigs: await GigModel.countDocuments()
    }
  }
})

