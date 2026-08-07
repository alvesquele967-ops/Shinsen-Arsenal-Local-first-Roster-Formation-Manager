import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import RosterView from './views/RosterView.vue'
import SkillsView from './views/SkillsView.vue'
import ArsenalView from './views/ArsenalView.vue'
import FormationsView from './views/FormationsView.vue'
import BackupView from './views/BackupView.vue'
import SettingsView from './views/SettingsView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView, meta: { title: 'ホーム' } },
    { path: '/heroes', component: RosterView, meta: { title: '武将図鑑' } },
    { path: '/skills', component: SkillsView, meta: { title: '戦法' } },
    { path: '/arsenal', component: ArsenalView, meta: { title: '兵器部隊' } },
    { path: '/formations', component: FormationsView, meta: { title: '編成' } },
    { path: '/backup', component: BackupView, meta: { title: 'バックアップ' } },
    { path: '/settings', component: SettingsView, meta: { title: '設定' } },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => { document.title = `${String(to.meta.title)} — 真戦武将帳` })
