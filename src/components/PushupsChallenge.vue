<script setup>
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import useUser from '@/composables/use-user'

const mvt = inject('mvt')

const isLoading = ref(false)
const showGoalModal = ref(false)
const showLogModal = ref(false)

const selectedDay = ref(null)
const dailyGoal = ref(0)
const goalCreatedAt = ref(null)

const newPushups = ref('')
const challengeData = ref(null)
const currentCarouselIndex = ref(0)
const screenWidth = ref(window.innerWidth)
const isLandscape = ref(window.innerWidth > window.innerHeight)

const { isLoggedIn } = useUser()

const KEY_DAILY_GOAL = 'daily_goal'

// Responsive carousel configuration
const getDaysToShow = computed(() => {
  if (screenWidth.value >= 1200) return 3
  if (screenWidth.value >= 768) return 2
  return 1
})

// Update screen dimensions on resize
const updateScreenDimensions = () => {
  screenWidth.value = window.innerWidth
  isLandscape.value = window.innerWidth > window.innerHeight
}

mvt.events.on(mvt.events.LOGGED_OUT, () => {
  dailyGoal.value = 0
  goalCreatedAt.value = null
  challengeData.value = null
  showGoalModal.value = false
  showLogModal.value = false
  selectedDay.value = null
  newPushups.value = ''
  currentCarouselIndex.value = 0
});

// Generate 30 days starting from daily goal creation date
const challengeDays = computed(() => {
  const days = []

  // If no goal is set, show 30 days starting from today
  const startDate = goalCreatedAt.value ? new Date(goalCreatedAt.value) : new Date()

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)

    days.push({
      day: i + 1,
      date: date,
      isToday: new Date().toDateString() === date.toDateString(),
      isPast: date < new Date()
    })
  }

  return days
})

// Determine starting carousel position
const getStartingCarouselIndex = computed(() => {
  if (!challengeData.value || challengeData.value.length === 0) {
    // If not tracked, start from day 1
    return 0
  } else {
    // If tracked, find today's position
    const today = new Date().toDateString()
    const todayIndex = challengeDays.value.findIndex(day => 
      day.date.toDateString() === today
    )
    return todayIndex !== -1 ? todayIndex : 0
  }
})

// Carousel days (responsive based on screen size)
const carouselDays = computed(() => {
  const startIndex = currentCarouselIndex.value
  const daysToShow = getDaysToShow.value
  return challengeDays.value.slice(startIndex, startIndex + daysToShow)
})

const getDayPushups = (date) => {
  if (!challengeData.value) return 0
  const dayData = challengeData.value.find(item => {
    // 2025-06-29
    return item.key === date.toISOString().split('T')[0]
  })
  return dayData ? dayData.value : 0
}

const getDayProgress = (date) => {
  const pushups = getDayPushups(date)
  if (!dailyGoal.value) return 0
  return Math.min((pushups / dailyGoal.value) * 100, 100)
}

const isDayComplete = (date) => {
  return getDayPushups(date) >= dailyGoal.value
}

const nextCarousel = () => {
  const daysToShow = getDaysToShow.value
  const maxIndex = challengeDays.value.length - daysToShow
  if (currentCarouselIndex.value < maxIndex) {
    currentCarouselIndex.value = Math.min(currentCarouselIndex.value + daysToShow, maxIndex)
  }
}

const prevCarousel = () => {
  const daysToShow = getDaysToShow.value
  if (currentCarouselIndex.value > 0) {
    currentCarouselIndex.value = Math.max(0, currentCarouselIndex.value - daysToShow)
  }
}

const goToToday = () => {
  const today = new Date().toDateString()
  const todayIndex = challengeDays.value.findIndex(day => 
    day.date.toDateString() === today
  )
  if (todayIndex !== -1) {
    currentCarouselIndex.value = todayIndex
  }
}

const openLogModal = async (day) => {
  if (!isLoggedIn.value) {
    await mvt.login()
    return
  }

  if (!dailyGoal.value) {
    showGoalModal.value = true
    return
  }

  selectedDay.value = day
  newPushups.value = ''
  showLogModal.value = true
}

const logPushups = async () => {
  if (!isLoggedIn.value) {
    await mvt.login()
    return
  }

  if (!newPushups.value || isNaN(newPushups.value) || parseInt(newPushups.value) <= 0) {
    alert('Please enter a valid number of push-ups')
    return
  }

  try {
    isLoading.value = true
    const pushupsToAdd = newPushups.value 
    // Use Member-specific endpoint
    await mvt.store.set('pushups', pushupsToAdd, selectedDay.value.date)

    // Store current carousel position before reloading data
    const currentPosition = currentCarouselIndex.value
    
    await loadChallengeData()
    
    // Restore carousel position after logging
    currentCarouselIndex.value = currentPosition
    
    showLogModal.value = false
    newPushups.value = ''
  } catch (error) {
    console.error('Error logging push-ups:', error)
    alert('Error logging push-ups. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const setDailyGoal = async () => {
  if (!isLoggedIn.value) {
    await mvt.login()
    return
  }

  if (!dailyGoal.value || isNaN(dailyGoal.value) || parseInt(dailyGoal.value) <= 0) {
    alert('Please enter a valid daily goal')
    return
  }

  try {
    isLoading.value = true
    // Use Member-specific endpoint
    await mvt.store.set(KEY_DAILY_GOAL, parseInt(dailyGoal.value))

    await getGoalData()

    showGoalModal.value = false
  } catch (error) {
    console.error('Error setting daily goal:', error)
    alert('Error setting daily goal. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const getGoalData = async () => {
  const result = await mvt.store.get(KEY_DAILY_GOAL)

  if (result) {
    dailyGoal.value = result.value
    goalCreatedAt.value = result.created_at
  } else {
    dailyGoal.value = 0
    goalCreatedAt.value = null
  }
}

const loadChallengeData = async () => {
  try {
    isLoading.value = true
    // Get start and end dates for query
    const startDate = new Date(challengeDays.value[0].date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(challengeDays.value[challengeDays.value.length - 1].date) 
    endDate.setHours(23, 59, 59, 999)

    const data = await mvt.store.queryMember('pushups', {
      filter: {
        tracked_after: startDate.toISOString(),
        tracked_before: endDate.toISOString()
      },

      aggregate: "sum",
      group_by: "day"
    })

    challengeData.value = data.results
    
    // Set initial carousel position after loading data
    currentCarouselIndex.value = getStartingCarouselIndex.value
  } catch (error) {
    console.error('Error loading challenge data:', error)
  } finally {
    isLoading.value = false
  }
}

const getTotalPushups = computed(() => {
  if (!challengeData.value) return 0
  return challengeData.value
    .reduce((sum, item) => sum + item.value, 0)
})

const getDaysCompleted = computed(() => {
  if (!challengeData.value || dailyGoal.value === 0) return 0
  return challengeDays.value.filter(day => isDayComplete(day.date)).length
})

onMounted(() => {
  getGoalData()
  loadChallengeData()
  window.addEventListener('resize', updateScreenDimensions)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateScreenDimensions)
})
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <h1 class="challenge-title">
        <span class="title-icon">🔥</span>
        30-Day Push-Up Challenge
      </h1>
      <div class="stats-container">
        <div class="stat-card">
          <div class="stat-icon">🎯</div>
          <div class="stat-content">
            <span class="stat-label">Daily Goal</span>
            <span class="stat-value">{{ dailyGoal || 'Not set' }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💪</div>
          <div class="stat-content">
            <span class="stat-label">Total Push-ups</span>
            <span class="stat-value">{{ getTotalPushups }}</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-content">
            <span class="stat-label">Days Completed</span>
            <span class="stat-value">{{ getDaysCompleted }}/30</span>
          </div>
        </div>
      </div>
      <button 
        v-if="!dailyGoal" 
        @click="isLoggedIn ? showGoalModal = true : mvt.login()"
        class="goal-button"
      >
        <span class="button-icon">🎯</span>
        {{ isLoggedIn ? 'Set Daily Goal' : 'Login to Start' }}
      </button>
    </div>

    <!-- Carousel Navigation -->
    <div class="carousel-navigation">
      <button 
        @click="prevCarousel" 
        :disabled="currentCarouselIndex === 0"
        class="nav-button prev"
      >
        <span class="nav-icon">←</span>
      </button>
      
      <div class="carousel-info">
        <span class="carousel-text">
          Days {{ currentCarouselIndex + 1 }}-{{ Math.min(currentCarouselIndex + getDaysToShow, 30) }} of 30
          <span class="days-info">({{ getDaysToShow }} day{{ getDaysToShow > 1 ? 's' : '' }})</span>
        </span>
        <button @click="goToToday" class="today-button">
          <span class="button-icon">📅</span>
          Go to Today
        </button>
      </div>
      
      <button 
        @click="nextCarousel" 
        :disabled="currentCarouselIndex + getDaysToShow >= challengeDays.length"
        class="nav-button next"
      >
        <span class="nav-icon">→</span>
      </button>
    </div>

    <div class="challenge-carousel" :class="`days-${getDaysToShow}`">
      <div 
        v-for="day in carouselDays" 
        :key="day.day" 
        class="day-card"
        :class="{ 
          'today': day.isToday, 
          'complete': isDayComplete(day.date),
          'past': day.isPast
        }"
      >
        <div class="day-header">
          <div class="day-number">
            <span class="day-text">Day {{ day.day }}</span>
            <span class="date">{{ day.date.toLocaleDateString() }}</span>
          </div>
          <div class="day-status">
            <span v-if="day.isToday" class="today-badge">Today</span>
            <span v-else-if="isDayComplete(day.date)" class="complete-badge">✓</span>
          </div>
        </div>
        
        <div class="day-content">
          <div class="pushups-display">
            <div class="pushups-count">
              <span class="count">{{ getDayPushups(day.date) }}</span>
              <span class="label">push-ups</span>
            </div>
            
            <div class="progress-container">
              <div class="progress-bar-wrapper">
                <div 
                  class="progress-bar" 
                  :style="{ width: getDayProgress(day.date) + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ Math.round(getDayProgress(day.date)) }}%</span>
            </div>
          </div>
          
          <button 
            @click="openLogModal(day)"
            :disabled="isLoading"
            class="log-button"
          >
            <span class="button-icon">📝</span>
            {{ isLoggedIn ? 'Log Push-ups' : 'Login to Log' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Daily Goal Modal -->
    <div v-if="showGoalModal" class="modal-overlay" @click="showGoalModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Set Your Daily Goal</h2>
          <p>How many push-ups do you want to do each day?</p>
        </div>
        <div class="modal-content">
          <div class="input-group">
            <label class="input-label">Daily Goal</label>
            <input 
              v-model="dailyGoal" 
              type="number"
              placeholder="Enter daily goal"
              min="1"
              class="goal-input"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showGoalModal = false" class="cancel-button">
            <span class="button-icon">❌</span>
            Cancel
          </button>
          <button @click="setDailyGoal" :disabled="isLoading" class="save-button">
            <span class="button-icon">💾</span>
            {{ isLoading ? 'Saving...' : 'Save Goal' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Log Push-ups Modal -->
    <div v-if="showLogModal" class="modal-overlay" @click="showLogModal = false">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h2>Log Push-ups for Day {{ selectedDay?.day }}</h2>
          <p>{{ selectedDay?.date.toLocaleDateString() }}</p>
          <div class="current-stats">
            <span class="current-label">Current total:</span>
            <span class="current-value">{{ getDayPushups(selectedDay?.date) }} push-ups</span>
          </div>
        </div>
        <div class="modal-content">
          <div class="input-group">
            <label class="input-label">Push-ups to Add</label>
            <input 
              v-model="newPushups" 
              type="number" 
              placeholder="Number of push-ups to add"
              min="1"
              class="pushups-input"
            />
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showLogModal = false" class="cancel-button">
            <span class="button-icon">❌</span>
            Cancel
          </button>
          <button @click="logPushups" :disabled="isLoading" class="save-button">
            <span class="button-icon">💾</span>
            {{ isLoading ? 'Logging...' : 'Log Push-ups' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.challenge-title {
  margin: 0 0 2rem 0;
  color: #2c3e50;
  font-size: 2.2rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.title-icon {
  font-size: 2rem;
}

.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b981, #059669);
  border-radius: 15px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-label {
  display: block;
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.stat-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: #2c3e50;
}

.goal-button {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 15px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.goal-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 35px rgba(16, 185, 129, 0.4);
}

.goal-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.carousel-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.nav-button {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.nav-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.nav-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.carousel-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.carousel-text {
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  text-align: center;
}

.days-info {
  font-size: 0.8rem;
  color: #7f8c8d;
  font-weight: 400;
  margin-left: 0.5rem;
}

.today-button {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.today-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.challenge-carousel {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
}

.challenge-carousel.days-1 {
  justify-content: center;
}

.challenge-carousel.days-2 {
  justify-content: space-between;
}

.challenge-carousel.days-3 {
  justify-content: space-between;
}

.day-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.day-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #10b981, #059669);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.day-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.day-card:hover::before {
  opacity: 1;
}

.day-card.today {
  border: 2px solid #10b981;
  box-shadow: 0 8px 32px rgba(16, 185, 129, 0.2);
}

.day-card.today::before {
  opacity: 1;
  background: linear-gradient(90deg, #10b981, #059669);
}

.day-card.complete {
  border: 2px solid #27ae60;
  background: linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.05));
}

.day-card.complete::before {
  opacity: 1;
  background: linear-gradient(90deg, #27ae60, #2ecc71);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.day-number {
  display: flex;
  flex-direction: column;
}

.day-text {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.date {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.day-status {
  display: flex;
  align-items: center;
}

.today-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.complete-badge {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.day-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pushups-display {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pushups-count {
  text-align: center;
}

.count {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  color: #10b981;
  line-height: 1;
}

.label {
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: 500;
}

.progress-container {
  position: relative;
  height: 12px;
  background: rgba(236, 240, 241, 0.8);
  border-radius: 10px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.progress-bar-wrapper {
  height: 100%;
  width: 100%;
  position: relative;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 10px;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: #2c3e50;
  text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
}

.log-button {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.log-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.log-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.button-icon {
  font-size: 1.1rem;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9));
  backdrop-filter: blur(20px);
  padding: 2.5rem;
  border-radius: 25px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.modal-header {
  text-align: center;
  margin-bottom: 2rem;
}

.modal-header h2 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
  font-weight: 700;
}

.modal-header p {
  margin: 0 0 1rem 0;
  color: #7f8c8d;
  font-size: 1rem;
}

.current-stats {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
  padding: 1rem;
  border-radius: 15px;
  margin-top: 1rem;
}

.current-label {
  display: block;
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
}

.current-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  color: #10b981;
}

.modal-content {
  margin-bottom: 2rem;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.goal-input,
.pushups-input {
  width: 100%;
  padding: 1rem 1.5rem;
  border: 2px solid rgba(236, 240, 241, 0.8);
  border-radius: 12px;
  font-size: 1rem;
  background: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.goal-input:focus,
.pushups-input:focus {
  outline: none;
  border-color: #10b981;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.cancel-button {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
}

.cancel-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(231, 76, 60, 0.4);
}

.save-button {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
}

.save-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(39, 174, 96, 0.4);
}

.save-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 768px) {
  .challenge-title {
    font-size: 1.8rem;
  }
  
  .stats-container {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .carousel-navigation {
    flex-direction: column;
    gap: 1rem;
  }
  
  .challenge-carousel {
    justify-content: center;
  }
  
  .day-card {
    flex: 1;
    min-width: 280px;
    max-width: 100%;
  }
  
  .modal {
    margin: 1rem;
    padding: 2rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}

@media (min-width: 769px) and (max-width: 1199px) {
  .challenge-carousel {
    justify-content: space-between;
  }
  
  .day-card {
    flex: 1;
    min-width: 0;
    max-width: calc(50% - 0.75rem);
  }
}

@media (min-width: 1200px) {
  .challenge-carousel {
    justify-content: space-between;
  }
  
  .day-card {
    flex: 1;
    min-width: 0;
    max-width: calc(33.333% - 1rem);
  }
}
</style> 