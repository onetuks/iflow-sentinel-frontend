<script setup lang="ts">
import { ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Topbar from './components/Topbar.vue';

const currentProject = ref('S-Oil IS 전환');
const isSidebarOpen = ref(false); // 모바일 환경 대응

const handleProjectChange = (projectName: string) => {
  currentProject.value = projectName;
};
</script>

<template>
  <div class="grid min-h-screen grid-cols-1 md:grid-cols-[250px_1fr]">
    <!-- 사이드바 -->
    <Sidebar 
      :current-project="currentProject"
      :is-open="isSidebarOpen"
      @update:project="handleProjectChange"
      @close="isSidebarOpen = false"
    />
    
    <!-- 메인 컨텐츠 영역 -->
    <div class="flex min-w-0 flex-col relative">
      <Topbar 
        :current-project="currentProject"
        @toggle-sidebar="isSidebarOpen = !isSidebarOpen"
      />
      <!-- 실제 화면이 표시되는 영역 (전체 화면 적용을 위해 w-full 사용) -->
      <main class="w-full max-w-none px-4 md:px-8 py-6 pb-12">
        <router-view />
      </main>
    </div>
  </div>
</template>
