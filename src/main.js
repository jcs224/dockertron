import { createApp } from 'vue'
import Oruga from '@oruga-ui/oruga-next'
import App from './App.vue'
import './css/app.css'
import '@fortawesome/fontawesome-free/css/all.css'
import '@oruga-ui/oruga-next/dist/oruga.css'

createApp(App).use(Oruga).mount('#app')
