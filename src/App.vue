<script setup lang="ts">
import { ref, onMounted, provide, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Topbar from './components/Topbar.vue';
import GlobalTaskHub from './components/GlobalTaskHub.vue';
import { apiService } from './services/api';
import { useAuth } from './composables/useAuth';

const { isAuthenticated } = useAuth();

const currentProject = ref('');
const isSidebarOpen = ref(false); // 모바일 환경 대응
const projects = ref<any[]>([]);

provide('currentProject', currentProject);
provide('projects', projects);

const fetchProjects = async () => {
  if (!isAuthenticated.value) return;
  projects.value = await apiService.getProjects();
  // If current project was deleted, or not set
  if (!projects.value.find(p => p.name === currentProject.value)) {
    if (projects.value.length > 0) {
      currentProject.value = projects.value[0].name;
    } else {
      currentProject.value = '';
    }
  }
};

onMounted(fetchProjects);
watch(isAuthenticated, (loggedIn) => {
  if (loggedIn) fetchProjects();
});

const handleProjectChange = (projectName: string) => {
  currentProject.value = projectName;
};
</script>

<template>
  <!-- 로그인 전: 레이아웃 없이 로그인 화면만 노출 -->
  <router-view v-if="!isAuthenticated" />

  <div v-else class="flex min-h-screen w-full">
    <!-- 사이드바 -->
    <Sidebar
      :current-project="currentProject"
      :projects="projects"
      :is-open="isSidebarOpen"
      @update:project="handleProjectChange"
      @refresh-projects="fetchProjects"
      @close="isSidebarOpen = false"
    />

    <!-- 메인 컨텐츠 영역 -->
    <div class="flex-1 flex min-w-0 flex-col relative w-full">
      <Topbar
        :current-project="currentProject"
        @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
      />
      <!-- 실제 화면이 표시되는 영역 (전체 화면 적용을 위해 w-full 사용) -->
      <main class="w-full max-w-none px-4 md:px-8 py-6 pb-12">
        <router-view @refresh-projects="fetchProjects" />
      </main>
    </div>

    <!-- 전역 백그라운드 태스크 허브 -->
    <GlobalTaskHub />
  </div>
</template>
