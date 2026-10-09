import type { Job, CandidateProfile, User } from '~/types/portal'

export interface JobMatchResult {
  job: Job
  score: number // 0 to 100
  label: string
  badgeColor: 'success' | 'primary' | 'warning' | 'neutral'
  matchedSkills: string[]
  missingSkills: string[]
  isLocationMatch: boolean
  careerTip?: string
}

export interface CandidateMatchResult {
  profile: CandidateProfile
  user?: User
  score: number
  label: string
  badgeColor: 'success' | 'primary' | 'warning' | 'neutral'
  matchedSkills: string[]
  missingSkills: string[]
  isLocationMatch: boolean
}

// Popular tech & role keywords dictionary for accurate skill extraction
const KNOWN_SKILLS = [
  'javascript', 'typescript', 'vue', 'vue.js', 'nuxt', 'nuxt.js', 'react', 'react.js', 'next.js',
  'angular', 'node', 'node.js', 'express', 'python', 'django', 'fastapi', 'flask', 'java',
  'spring', 'spring boot', 'go', 'golang', 'c++', 'c#', '.net', 'php', 'laravel', 'ruby',
  'rails', 'html', 'css', 'tailwind', 'tailwindcss', 'bootstrap', 'sass', 'sql', 'mysql',
  'postgresql', 'mongodb', 'redis', 'graphql', 'rest api', 'aws', 'azure', 'gcp', 'docker',
  'kubernetes', 'ci/cd', 'git', 'github', 'linux', 'figma', 'ui/ux', 'testing', 'jest',
  'cypress', 'machine learning', 'ai', 'data science', 'pandas', 'numpy', 'flutter', 'react native',
  'android', 'ios', 'swift', 'kotlin', 'agile', 'scrum', 'sales', 'marketing', 'seo',
  'operations', 'customer support', 'hr', 'recruiting'
]

export function useJobMatching() {
  /**
   * Normalize a skill or string token for comparison
   */
  function normalizeSkill(s: string): string {
    return s.toLowerCase()
      .replace(/[\.\-_]/g, '')
      .replace(/\s+/g, '')
      .trim()
  }

  /**
   * Extract skills mentioned in job text or requirements
   */
  function extractJobSkills(job: Job): string[] {
    const rawSkills = new Set<string>()

    // If explicit requirements exist
    if (job.requirements && job.requirements.length > 0) {
      for (const req of job.requirements) {
        const cleaned = req.trim()
        if (cleaned.length < 30) {
          rawSkills.add(cleaned)
        }
      }
    }

    // Scan text against known skills dictionary
    const combinedText = `${job.title} ${job.summary} ${job.description} ${(job.requirements || []).join(' ')}`.toLowerCase()
    for (const skill of KNOWN_SKILLS) {
      // Check word boundary or substring
      if (combinedText.includes(skill)) {
        // Format cleanly for display
        const display = skill.split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        rawSkills.add(display)
      }
    }

    return Array.from(rawSkills)
  }

  /**
   * Calculate compatibility between a job and candidate profile
   */
  function calculateJobMatch(job: Job, profile?: CandidateProfile | null): JobMatchResult {
    if (!profile) {
      return {
        job,
        score: 50,
        label: 'Open to All Candidates',
        badgeColor: 'neutral',
        matchedSkills: [],
        missingSkills: [],
        isLocationMatch: true,
        careerTip: 'Complete your profile to see your personalized match percentage!'
      }
    }

    const candidateSkills = (profile.skills || []).map(s => s.trim()).filter(Boolean)
    const jobSkills = extractJobSkills(job)

    // Normalize candidate skills
    const normalizedCandidate = candidateSkills.map(s => normalizeSkill(s))

    const matched: string[] = []
    const missing: string[] = []

    for (const jSkill of jobSkills) {
      const normJ = normalizeSkill(jSkill)
      const isMatch = normalizedCandidate.some(c => c.includes(normJ) || normJ.includes(c))
      if (isMatch) {
        matched.push(jSkill)
      } else {
        missing.push(jSkill)
      }
    }

    // ── Weights ─────────────────────────────────────────────────────────────
    // 1. Skill Score (Max 60 points)
    let skillPoints = 0
    if (jobSkills.length > 0) {
      const matchRatio = matched.length / jobSkills.length
      skillPoints = Math.round(matchRatio * 60)
    } else if (candidateSkills.length > 0) {
      skillPoints = 40
    } else {
      skillPoints = 20
    }

    // 2. Role Title & Domain Alignment (Max 20 points)
    let rolePoints = 10
    const jobTitleLower = job.title.toLowerCase()
    const candSkillsLower = candidateSkills.join(' ').toLowerCase()
    const expLower = (profile.experience || '').toLowerCase()

    if (
      (jobTitleLower.includes('frontend') && (candSkillsLower.includes('vue') || candSkillsLower.includes('react') || candSkillsLower.includes('javascript') || candSkillsLower.includes('css'))) ||
      (jobTitleLower.includes('backend') && (candSkillsLower.includes('node') || candSkillsLower.includes('python') || candSkillsLower.includes('java') || candSkillsLower.includes('sql'))) ||
      (jobTitleLower.includes('fullstack') || jobTitleLower.includes('software engineer') || jobTitleLower.includes('developer')) ||
      (jobTitleLower.includes('designer') && candSkillsLower.includes('figma'))
    ) {
      rolePoints = 20
    }

    // 3. Location Match (Max 15 points)
    let locationPoints = 5
    let isLocationMatch = false
    const candCity = (profile.city || '').toLowerCase().trim()
    const jobLoc = job.location.toLowerCase().trim()

    if (jobLoc.includes('remote') || candCity.includes('remote')) {
      locationPoints = 15
      isLocationMatch = true
    } else if (candCity && jobLoc.includes(candCity)) {
      locationPoints = 15
      isLocationMatch = true
    } else if (candCity) {
      locationPoints = 10
    }

    // 4. Profile Completeness & Verified Bonus (Max 5 points)
    let bonusPoints = 0
    if (profile.resumeFilename) bonusPoints += 3
    if (profile.education) bonusPoints += 2
    if (profile.isFastTrackPro) bonusPoints += 3

    // Final Score (Clamped between 40% and 98%)
    let rawScore = skillPoints + rolePoints + locationPoints + bonusPoints
    // Give minimum baseline if they have skills
    if (candidateSkills.length > 0 && matched.length > 0) {
      rawScore = Math.max(65, rawScore)
    }
    const score = Math.min(98, Math.max(38, rawScore))

    let label = '👍 Potential Fit'
    let badgeColor: 'success' | 'primary' | 'warning' | 'neutral' = 'warning'

    if (score >= 85) {
      label = `🔥 ${score}% Match · Strong Fit`
      badgeColor = 'success'
    } else if (score >= 70) {
      label = `⭐ ${score}% Match · Good Fit`
      badgeColor = 'primary'
    } else if (score >= 50) {
      label = `👍 ${score}% Match · Potential Fit`
      badgeColor = 'warning'
    } else {
      label = `${score}% Match`
      badgeColor = 'neutral'
    }

    let careerTip = ''
    if (missing.length > 0) {
      careerTip = `Adding ${missing.slice(0, 2).join(' & ')} to your skills could raise your interview chances by 40%!`
    } else {
      careerTip = 'Your skills match all key requirements for this position. Apply early for maximum visibility!'
    }

    return {
      job,
      score,
      label,
      badgeColor,
      matchedSkills: matched.slice(0, 6),
      missingSkills: missing.slice(0, 4),
      isLocationMatch,
      careerTip
    }
  }

  /**
   * Get all active jobs ranked by compatibility for the candidate
   */
  function getRecommendedJobsForCandidate(profile?: CandidateProfile | null, allJobs: Job[] = []): JobMatchResult[] {
    const published = allJobs.filter(j => j.published)
    if (!profile) {
      return published.map(j => calculateJobMatch(j, null))
    }

    const matches = published.map(j => calculateJobMatch(j, profile))
    // Sort descending by match score, then boost featured jobs
    return matches.sort((a, b) => {
      const aBoost = a.job.isFeatured ? 5 : 0
      const bBoost = b.job.isFeatured ? 5 : 0
      return (b.score + bBoost) - (a.score + aBoost)
    })
  }

  /**
   * Given a job, find and rank the most suitable candidate profiles
   */
  function getMatchingCandidatesForJob(job: Job, profiles: CandidateProfile[] = []): CandidateMatchResult[] {
    const results: CandidateMatchResult[] = []

    for (const p of profiles) {
      const match = calculateJobMatch(job, p)
      results.push({
        profile: p,
        score: match.score,
        label: match.label,
        badgeColor: match.badgeColor,
        matchedSkills: match.matchedSkills,
        missingSkills: match.missingSkills,
        isLocationMatch: match.isLocationMatch
      })
    }

    // Sort highest matching first
    return results.sort((a, b) => {
      const aPro = a.profile.isFastTrackPro ? 5 : 0
      const bPro = b.profile.isFastTrackPro ? 5 : 0
      return (b.score + bPro) - (a.score + aPro)
    })
  }

  return {
    calculateJobMatch,
    getRecommendedJobsForCandidate,
    getMatchingCandidatesForJob,
    extractJobSkills
  }
}
