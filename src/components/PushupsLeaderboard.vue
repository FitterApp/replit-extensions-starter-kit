<script setup>
import { ref, inject, onMounted, computed } from 'vue'
import useUser from '@/composables/use-user'

const mvt = inject('mvt')

const isLoading = ref(false)
const leaderboardData = ref([])

const { isLoggedIn, user } = useUser()

const loadLeaderboardData = async () => {
  try {
    isLoading.value = true

    // Query all pushups data aggregated by subscriber_id
    const data = await mvt.store.query('pushups', {
      aggregate: "sum",
      group_by: "subscriber_id",
      order: "desc"
    })

    leaderboardData.value = data.results
  } catch (error) {
    console.error('Error loading leaderboard data:', error)
  } finally {
    isLoading.value = false
  }
}

const currentUserRank = computed(() => {
  if (!isLoggedIn.value || !user.value) return null

  const userEntry = leaderboardData.value.find(item => item.member?.user_id === user.value.id)

  if (!userEntry) return null

  return leaderboardData.value.findIndex(item => item.member && item.member.user_id === user.value.id) + 1
})

const currentUserTotal = computed(() => {
  if (!isLoggedIn.value || !user.value) return 0
  
  const userEntry = leaderboardData.value.find(item => item.member && item.member.user_id === user.value.id)
  
  return userEntry ? userEntry.value : 0
})

const formatName = (member) => {
  if (!member) return 'Anonymous'
  return member.name || member.email || 'Anonymous'
}

onMounted(() => {
  loadLeaderboardData()
})
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <h1>Push-ups Leaderboard</h1>
      <p>See how you rank against other participants!</p>
    </div>

    <!-- Current User Stats -->
    <div v-if="isLoggedIn && currentUserRank" class="user-stats">
      <div class="user-stat-card">
        <h3>Your Stats</h3>
        <div class="user-stat-content">
          <div class="stat-item">
            <span class="stat-label">Rank:</span>
            <span class="stat-value rank">#{{ currentUserRank }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Push-ups:</span>
            <span class="stat-value">{{ currentUserTotal }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="leaderboard-container">
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Loading leaderboard...</p>
      </div>

      <div v-else-if="leaderboardData.length === 0" class="empty-state">
        <p>No participants yet. Be the first to join the challenge!</p>
      </div>

      <div v-else class="leaderboard">
        <div class="leaderboard-header">
          <span class="rank-header">Rank</span>
          <span class="name-header">Name</span>
          <span class="total-header">Total Push-ups</span>
        </div>

        <div 
          v-for="(entry, index) in leaderboardData" 
          :key="entry.member?.user_id || index"
          class="leaderboard-row"
          :class="{ 
            'current-user': isLoggedIn && entry.member?.user_id === user?.id,
            'top-3': index < 3
          }"
        >
          <div class="rank">
            <span v-if="index < 3" class="medal">
              {{ index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉' }}
            </span>
            <span v-else class="rank-number">#{{ index + 1 }}</span>
          </div>
          
          <div class="name">
            {{ formatName(entry.member) }}
          </div>
          
          <div class="total">
            {{ entry.value }} push-ups
          </div>
        </div>
      </div>
    </div>

    <!-- Refresh Button -->
    <div class="actions">
      <button 
        @click="loadLeaderboardData" 
        :disabled="isLoading"
        class="refresh-button"
      >
        {{ isLoading ? 'Refreshing...' : 'Refresh Leaderboard' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin-bottom: 0.5rem;
  color: #333;
}

.header p {
  color: #666;
  margin: 0;
}

.user-stats {
  margin-bottom: 2rem;
}

.user-stat-card {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
}

.user-stat-card h3 {
  margin: 0 0 1rem 0;
  font-size: 1.2em;
}

.user-stat-content {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.9em;
  opacity: 0.9;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.5em;
  font-weight: bold;
}

.stat-value.rank {
  color: #FFD700;
}

.leaderboard-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 2rem;
}

.loading {
  padding: 3rem;
  text-align: center;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  padding: 3rem;
  text-align: center;
  color: #666;
}

.leaderboard-header {
  display: grid;
  grid-template-columns: 80px 1fr 150px;
  gap: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  font-weight: bold;
  color: #333;
  border-bottom: 2px solid #e9ecef;
}

.leaderboard-row {
  display: grid;
  grid-template-columns: 80px 1fr 150px;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  transition: background-color 0.2s;
}

.leaderboard-row:hover {
  background-color: #f8f9fa;
}

.leaderboard-row.current-user {
  background-color: #e3f2fd;
  border-left: 4px solid #2196F3;
}

.leaderboard-row.top-3 {
  background-color: #fff8e1;
}

.rank {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.medal {
  font-size: 1.5em;
}

.rank-number {
  color: #666;
}

.name {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.total {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-weight: bold;
  color: #4CAF50;
}

.actions {
  text-align: center;
}

.refresh-button {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.refresh-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.refresh-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .user-stat-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .leaderboard-header,
  .leaderboard-row {
    grid-template-columns: 60px 1fr 100px;
    gap: 0.5rem;
    padding: 0.75rem;
  }
  
  .medal {
    font-size: 1.2em;
  }
  
  .total {
    font-size: 0.9em;
  }
}
</style> 