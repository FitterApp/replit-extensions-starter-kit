import { ref, computed } from 'vue'
import { inject } from 'vue'

export default function useUser() {
  const mvt = inject('mvt') as any
  const user = ref(mvt.user)

  mvt.events.on('loggedIn', () => {
    user.value = mvt.user
  })

  mvt.events.on('loggedOut', () => {
    user.value = null
  })

  const isLoggedIn = computed(() => Object.keys(user.value).length > 0)

  return { user, isLoggedIn }
}
