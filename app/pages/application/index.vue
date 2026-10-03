<script setup lang="ts">
const { applications } = useApplications()
</script>

<template>
  <UContainer class="py-12">
    <h1 class="text-3xl font-bold tracking-tight text-gray-950 dark:text-white">My applications</h1>
    <p class="mt-2 text-gray-600 dark:text-gray-300">Track each qualification step from one place.</p>
    <div v-if="applications.length" class="mt-8 grid gap-4"><UCard v-for="application in applications" :key="application.id"><div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold text-gray-950 dark:text-white">Application {{ application.id.slice(-6) }}</p><p class="mt-1 text-sm text-gray-500">Current status: {{ application.status.replaceAll('_', ' ') }}</p></div><UButton :to="`/application/${application.id}`" label="View progress" /></div></UCard></div>
    <UEmpty v-else class="mt-10" title="No applications yet" description="Browse open roles to begin your first application." icon="i-lucide-briefcase-business"><template #links><UButton to="/jobs" label="Browse jobs" /></template></UEmpty>
  </UContainer>
</template>
