export default defineNuxtPlugin(() => {
  if (import.meta.server) return

  // Seed demo data on first load
  seedDemoData()

  // Hydrate current user from localStorage
  const { hydrate } = useAuth()
  hydrate()
})
