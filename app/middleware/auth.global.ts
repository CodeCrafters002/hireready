export default defineNuxtRouteMiddleware((to) => {
  // Only run on client
  if (import.meta.server) return

  const { currentUser, isAuthenticated } = useAuth()

  const path = to.path

  // Candidate-only routes (admins and officers also permitted for supervision & testing)
  if (path.startsWith('/candidate')) {
    if (!isAuthenticated.value) {
      return navigateTo('/auth/sign-in?redirect=' + encodeURIComponent(path))
    }
    if (currentUser.value?.role !== 'candidate' && currentUser.value?.role !== 'admin' && currentUser.value?.role !== 'officer') {
      return navigateTo('/')
    }
  }

  // Admin & Officer routes
  if (path.startsWith('/admin')) {
    if (!isAuthenticated.value) {
      return navigateTo('/auth/sign-in?redirect=' + encodeURIComponent(path))
    }
    if (currentUser.value?.role !== 'admin' && currentUser.value?.role !== 'officer') {
      return navigateTo('/')
    }
  }
})
