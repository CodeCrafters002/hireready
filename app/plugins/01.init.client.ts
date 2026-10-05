export default defineNuxtPlugin(async () => {
  if (import.meta.server) return

  // Seed demo data into localStorage as immediate offline cache
  seedDemoData()

  // Hydrate current user from localStorage
  const { hydrate } = useAuth()
  hydrate()

  // Asynchronously synchronize with MongoDB Atlas
  const store = useDataStore()
  store.syncWithDatabase()
})
