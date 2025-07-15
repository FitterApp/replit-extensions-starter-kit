<script setup>
import { ref } from 'vue'
import PushupsChallenge from './components/PushupsChallenge.vue'
import PushupsLeaderboard from './components/PushupsLeaderboard.vue'

const activeTab = ref('challenge')
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <h1>30-Day Push-Up Challenge</h1>
      
      <div class="tab-navigation">
        <button 
          @click="activeTab = 'challenge'"
          :class="{ active: activeTab === 'challenge' }"
          class="tab-button"
        >
          My Challenge
        </button>
        <button 
          @click="activeTab = 'leaderboard'"
          :class="{ active: activeTab === 'leaderboard' }"
          class="tab-button"
        >
          Leaderboard
        </button>
      </div>
    </div>

    <div class="content">
      <PushupsChallenge v-if="activeTab === 'challenge'" />
      <PushupsLeaderboard v-if="activeTab === 'leaderboard'" />
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin-bottom: 1.5rem;
  color: #10b981;
}

.tab-navigation {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.tab-button {
  background-color: #f5f5f5;
  color: #666;
  border: 2px solid transparent;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.3s ease;
}

.tab-button:hover {
  background-color: #e9e9e9;
  color: #333;
}

.tab-button.active {
  background-color: #10b981;
  color: white;
  border-color: #10b981;
}

.tab-button.active:hover {
  background-color: #059669;
}

.content {
  min-height: 400px;
}

@media (max-width: 768px) {
  .tab-navigation {
    flex-direction: column;
    align-items: center;
  }
  
  .tab-button {
    width: 200px;
  }
}
</style>
