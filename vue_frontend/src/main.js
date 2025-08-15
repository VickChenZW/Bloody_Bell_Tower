import './assets/tailwindcss.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useUserStore } from './stores/userStore'
import { socketService } from './socket'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const userStore = useUserStore();
userStore.tryAutoLogin();

if (userStore.isLoggedIn) {
    socketService.connect();
}

app.mount('#app')
