import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import { useUiTheme } from './composables/useUiTheme'

useUiTheme()
createApp(App).use(router).mount('#app')
