<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import TramaLogo from '@trama/components/TramaLogo.vue'
import LoginPage from '@trama/components/login/LoginPage.vue'
import RegisterPage from '@trama/components/login/RegisterPage.vue'
import ResetPasswordPage from '@trama/components/login/ResetPasswordPage.vue'
import LoginFooter from '@trama/components/login/LoginFooter.vue'
import { apiStatus } from '@trama/services/api'

const route = useRoute()
const tab = ref(route.query.tab === 'register' || apiStatus.setupRequired ? 'register' : 'login')

function changeTab(name) {
  tab.value = name
}
</script>

<template>
  <div>
    <v-container fluid class="login-container">
      <v-icon icon="custom:trama-logo" size="40rem" color="primary" class="fiqon-icon" />
      <v-card class="login-row p-absolute-center justify-center">
        <div class="d-flex flex-column align-center my-6">
          <TramaLogo logo-width="250" by3c />
        </div>
        <v-col>
          <v-alert v-if="apiStatus.error" type="error" variant="tonal" class="mb-5">{{ apiStatus.error }}</v-alert>
          <v-alert v-if="apiStatus.setupRequired" type="info" variant="tonal" class="mb-5" density="compact">Crie a primeira conta desta instalação para começar.</v-alert>
          <v-window v-model="tab" class="transition-window" reverse>
            <v-window-item value="login"><LoginPage @change-tab="changeTab" /></v-window-item>
            <v-window-item value="register"><RegisterPage @change-tab="changeTab" /></v-window-item>
            <v-window-item value="forgotPassword"><ResetPasswordPage @change-tab="changeTab" /></v-window-item>
          </v-window>
        </v-col>
      </v-card>
    </v-container>
    <LoginFooter />
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
  position: relative;
}

.fiqon-icon {
  position: absolute;
  bottom: -10rem;
  right: -10rem;
  animation: float 6s ease-in-out infinite;
}

.login-row {
  width: 600px;
  max-width: 100%;
  background-color: rgb(var(--v-theme-surface));
  padding: 20px;
}

/* Em telas baixas o card centralizado em absoluto é cortado no original;
   aqui ele passa a fluir normalmente e a página rola. */
@media (max-height: 760px) {
  .login-container {
    overflow-y: auto;
  }

  .login-row {
    position: relative;
    left: auto;
    top: auto;
    transform: none;
    margin: 16px auto;
  }
}

@keyframes float {
  0% {
    filter: blur(30px);
    transform: translatey(0);
  }
  50% {
    filter: blur(10px);
    transform: translatey(-40px);
  }
  100% {
    filter: blur(30px);
    transform: translatey(0);
  }
}
</style>
