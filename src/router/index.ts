import { createRouter, createWebHistory } from 'vue-router';
import Overview from '../views/Overview.vue';
import Landscape from '../views/Landscape.vue';
import Rulesets from '../views/Rulesets.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/overview'
    },
    {
      path: '/overview',
      name: 'Overview',
      component: Overview
    },
    {
      path: '/landscape',
      name: 'Landscape',
      component: Landscape
    },
    {
      path: '/rulesets',
      name: 'Rulesets',
      component: Rulesets
    },
    {
      path: '/run',
      name: 'Run',
      component: () => import('../views/Run.vue')
    },
    {
      path: '/report',
      name: 'Report',
      component: () => import('../views/Report.vue')
    },
    {
      path: '/library',
      name: 'Library',
      component: () => import('../views/Library.vue')
    },
    {
      path: '/parser-explorer',
      name: 'ParserExplorer',
      component: () => import('../views/ParserExplorer.vue')
    },
    {
      path: '/artifact-tracker',
      name: 'ArtifactTracker',
      component: () => import('../views/ArtifactTracker.vue')
    },
    // {
    //   path: '/property-explorer',
    //   name: 'PropertyExplorer',
    //   component: () => import('../views/PropertyExplorer.vue')
    // }
  ]
});

export default router;
