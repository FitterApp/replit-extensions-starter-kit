<script setup>
import useUser from "@/composables/use-user"
const { user, isLoggedIn } = useUser()
</script>


<template>
  <div class="wrapper">
    <div class="header">
      <h1>Example Extension</h1>
      
      <header>
        <h3 v-if="isLoggedIn">
          Welcome, {{ user.name }}!
        </h3>

        <button class="v-button --primary" v-if="!isLoggedIn" @click="() => mvt.login()">Login</button>
        <button class="v-button --secondary" v-else @click="() => mvt.logout()">Logout</button>
      </header>
    </div>
  </div>
</template>

<style scoped>
</style>
