import type { Job } from '~/types/portal'

// Fallback static jobs for SSR and when localStorage is empty
export const staticJobs: Job[] = [
  { id: 'frontend-developer', title: 'Frontend Developer', company: 'BrightStack Technologies', location: 'Bengaluru / Hybrid', type: 'Full-time', salary: '₹5–8 LPA', summary: 'Build clean, responsive product experiences using Vue and modern JavaScript.', description: 'You will work with a product team to turn designs into fast, accessible interfaces and improve our existing web application.', requirements: ['1+ year of frontend experience', 'JavaScript or TypeScript', 'Vue, React, or similar framework', 'Strong HTML and CSS fundamentals'], published: true, createdAt: '2026-06-01T09:00:00Z' },
  { id: 'java-backend-engineer', title: 'Java Backend Engineer', company: 'CloudNest Systems', location: 'Pune / Remote', type: 'Full-time', salary: '₹7–11 LPA', summary: 'Design reliable APIs and services for a growing B2B SaaS platform.', description: 'Join a backend team building secure, scalable services. You will own API features from design through production support.', requirements: ['2+ years with Java and Spring Boot', 'REST API development', 'SQL and relational databases', 'Git and code review experience'], published: true, createdAt: '2026-06-15T09:00:00Z' },
  { id: 'business-analyst', title: 'Business Analyst', company: 'Apex Retail Labs', location: 'Mumbai', type: 'Full-time', salary: '₹4–7 LPA', summary: 'Turn business questions into useful reports, requirements, and decisions.', description: 'You will partner with operational teams, document requirements, and deliver clear analysis that improves customer and business outcomes.', requirements: ['Strong Excel or Google Sheets skills', 'Clear written communication', 'Basic SQL is a plus', 'Comfort working with stakeholders'], published: true, createdAt: '2026-07-01T09:00:00Z' },
  { id: 'qa-engineer', title: 'QA Engineer', company: 'Finbox Solutions', location: 'Hyderabad / Hybrid', type: 'Full-time', salary: '₹4–6 LPA', summary: 'Help ship trusted financial software through thoughtful manual and automated testing.', description: 'You will create test plans, report issues clearly, and partner with engineers to make releases safer and faster.', requirements: ['Knowledge of software testing basics', 'Attention to detail', 'API testing experience is helpful', 'Good communication skills'], published: true, createdAt: '2026-07-15T09:00:00Z' }
]

// Helper to get jobs — prefers localStorage, falls back to static
export function getJobsList(): Job[] {
  if (import.meta.server) return staticJobs
  const store = useDataStore()
  const stored = store.getPublishedJobs()
  return stored.length > 0 ? stored : staticJobs
}

// Keep backward-compatible export
export const jobs = staticJobs
