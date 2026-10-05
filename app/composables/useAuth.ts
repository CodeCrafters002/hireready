import type { User, UserRole } from '~/types/portal'

const AUTH_KEY = 'hr_current_user'

export function useAuth() {
  const currentUser = useState<User | null>('currentUser', () => null)

  // Hydrate from localStorage on first client load
  function hydrate() {
    if (import.meta.server) return
    if (currentUser.value) return
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) currentUser.value = JSON.parse(raw) as User
    } catch {
      currentUser.value = null
    }
  }

  function signIn(email: string, _password: string): { success: boolean; error?: string } {
    const store = useDataStore()
    const user = store.getUserByEmail(email)
    if (!user) return { success: false, error: 'No account found with this email.' }
    // Demo mode — accept any password
    currentUser.value = user
    if (!import.meta.server) localStorage.setItem(AUTH_KEY, JSON.stringify(user))

    // Optional background check with backend
    $fetch('/api/auth/login', { method: 'POST', body: { email, password: _password } }).catch(() => null)

    return { success: true }
  }

  function signUp(name: string, email: string, _password: string, role: UserRole = 'candidate'): { success: boolean; error?: string; user?: User } {
    const store = useDataStore()
    if (store.getUserByEmail(email)) return { success: false, error: 'An account with this email already exists.' }
    const user = store.createUser({ name, email, role, passwordHash: 'demo_hash' })
    // Auto-create blank profile for candidates
    if (role === 'candidate') {
      store.upsertProfile({
        userId: user.id,
        fullName: name,
        email,
        mobile: '',
        city: '',
        skills: [],
        education: '',
        experience: '',
        resumeFilename: '',
        profilePhotoUrl: '',
        updatedAt: new Date().toISOString()
      })
    }
    currentUser.value = user
    if (!import.meta.server) localStorage.setItem(AUTH_KEY, JSON.stringify(user))

    // Persist registration to MongoDB Atlas
    $fetch('/api/auth/register', {
      method: 'POST',
      body: { name, email, role }
    }).catch(err => {
      console.warn('[Auth] MongoDB user register sync:', err)
    })

    return { success: true, user }
  }

  function signOut() {
    currentUser.value = null
    if (!import.meta.server) localStorage.removeItem(AUTH_KEY)
    navigateTo('/')
  }

  function requireRole(role: UserRole): boolean {
    return currentUser.value?.role === role
  }

  const isAuthenticated = computed(() => !!currentUser.value)
  const isCandidate = computed(() => currentUser.value?.role === 'candidate')
  const isAdmin = computed(() => currentUser.value?.role === 'admin')
  const isOfficer = computed(() => currentUser.value?.role === 'officer')
  const isEmployer = computed(() => currentUser.value?.role === 'employer')

  return {
    currentUser,
    hydrate,
    signIn,
    signUp,
    signOut,
    requireRole,
    isAuthenticated,
    isCandidate,
    isAdmin,
    isOfficer,
    isEmployer
  }
}
