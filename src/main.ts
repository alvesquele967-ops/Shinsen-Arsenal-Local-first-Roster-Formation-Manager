import { createApp } from 'vue'
import App from './App.vue'
import { router } from './shinsen/router'
import './shinsen/styles.css'

const app = createApp(App)

app.use(router)
app.mount('#app')
