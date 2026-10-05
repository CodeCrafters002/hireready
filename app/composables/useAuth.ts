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

  async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' }
    }

    try {
      // Authenticate with server database (validates real password)
      const user = await $fetch<User>('/api/auth/login', {
        method: 'POST',
        body: { email: cleanEmail, password }
      })

      if (!user || !user.id) {
        return { success: false, error: 'Invalid email or password.' }
      }

      currentUser.value = user
      if (!import.meta.server) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user))
      }

      // Sync local store
      const store = useDataStore()
      const existing = store.getUserByEmail(user.email)
      if (!existing) {
        store.saveUsers([...store.getUsers(), user])
      } else if (existing.role !== user.role) {
        store.updateUserRole(existing.id, user.role)
      }

      return { success: true }
    } catch (err: any) {
      const msg = err.data?.statusMessage || err.message || 'Invalid email or password.'
      return { success: false, error: msg }
    }
  }

  async function signUp(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'candidate',
    metadata: { company?: string; orgType?: string; contactPerson?: string; city?: string } = {}
  ): Promise<{ success: boolean; error?: string; user?: User }> {
    const cleanEmail = email.toLowerCase().trim()
    const store = useDataStore()
    if (store.getUserByEmail(cleanEmail)) return { success: false, error: 'An account with this email already exists.' }
    const user = await store.createUser({
      name,
      email: cleanEmail,
      role,
      passwordHash: password,
      ...metadata
    })
    // Auto-create blank profile for candidates
    if (role === 'candidate') {
      store.upsertProfile({
        userId: user.id,
        fullName: name,
        email: cleanEmail,
        mobile: '',
        city: metadata.city || '',
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

    // Persist registration to MongoDB Atlas with password
    try {
      await $fetch('/api/auth/register', {
        method: 'POST',
        body: { name, email: cleanEmail, password, role, ...metadata }
      })
    } catch (err: any) {
      console.warn('[Auth] MongoDB user register sync:', err)
    }

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
