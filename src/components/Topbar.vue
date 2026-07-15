<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { Search, Bell, Menu } from 'lucide-vue-next';

defineProps<{
  currentProject: string;
}>();

defineEmits<{
  (e: 'toggle-sidebar'): void;
}>();

const route = useRoute();
const screenName = computed(() => {
  if (route.name === 'Overview') return '개요';
  if (route.name === 'Landscape') return '랜드스케이프';
  if (route.name === 'Rulesets') return '적용 규칙';
  if (route.name === 'Run') return '검사 실행';
  if (route.name === 'Report') return '검사 리포트';
  if (route.name === 'Library') return '규칙 라이브러리';
  return '페이지';
});
</script>

<template>
  <header class="sticky top-0 z-10 flex h-[60px] items-center gap-3 border-b border-line bg-[#F4F5FA]/80 px-4 backdrop-blur-[10px] md:px-7">
    <!-- 모바일 메뉴 버튼 -->
    <button class="md:hidden p-1 mr-2" @click="$emit('toggle-sidebar')">
      <Menu class="w-5 h-5 text-ink" />
    </button>

    <!-- 브레드크럼 -->
    <div class="flex items-center gap-2 text-[13px] text-muted">
      <span class="font-disp font-semibold text-ink">{{ currentProject }}</span>
      <span class="text-faint">/</span>
      <b class="font-semibold text-ink">{{ screenName }}</b>
    </div>

    <!-- 우측 도구모음 -->
    <div class="ml-auto flex items-center gap-2.5">
      <div class="flex w-[200px] items-center gap-2 rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 text-[12.5px] text-faint">
        <Search class="h-[15px] w-[15px]" />
        iFlow 검색…
      </div>
      <button class="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line-2 bg-surface text-muted transition hover:border-[#D2D6E2] hover:text-ink">
        <Bell class="h-[17px] w-[17px]" />
      </button>
    </div>
  </header>
</template>
