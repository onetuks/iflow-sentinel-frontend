<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Box, 
  Map, 
  Settings2,
  PlayCircle,
  ChevronDown
} from 'lucide-vue-next';

const props = defineProps<{
  currentProject: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:project', projectName: string): void;
  (e: 'close'): void;
}>();

const isMenuOpen = ref(false);
const isCheckMenuOpen = ref(true);
const isRuleMenuOpen = ref(true);

const projects = [
  { name: 'S-Oil IS 전환', initial: 'S', gradient: 'from-[#F0A35E] to-[#E0663C]' },
  { name: 'NanoH2O IS 전환', initial: 'N', gradient: 'from-[#5AC8E0] to-[#3E8BD0]' },
  { name: 'Hynix 신규 개발', initial: 'H', gradient: 'from-[#8B7DF0] to-[#5B4BD0]' }
];

const currentProjectData = computed(() => {
  return projects.find(p => p.name === props.currentProject) || projects[0];
});

const selectProject = (projectName: string) => {
  emit('update:project', projectName);
  isMenuOpen.value = false;
};
</script>

<template>
  <aside 
    :class="[
      'fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-line bg-side transition-transform duration-300 ease-in-out md:static md:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    ]"
  >
    <!-- 브랜드 로고 -->
    <div class="flex items-center gap-3 px-5 py-5 pb-3">
      <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E7BF5] via-[#4C5DF0] to-[#3A3FD0] text-white shadow-[0_4px_12px_rgba(76,93,240,0.35)]">
        <Box class="h-[18px] w-[18px]" />
      </span>
      <div>
        <b class="font-disp text-base font-bold leading-none tracking-tight">iFlow Sentinel</b>
        <small class="mt-[3px] block font-sans text-[11px] font-medium tracking-wide text-faint">규칙 준수 체커</small>
      </div>
      <!-- 모바일 닫기 버튼 -->
      <button class="ml-auto block md:hidden" @click="$emit('close')">X</button>
    </div>

    <!-- 프로젝트 스위처 -->
    <div class="relative mx-[14px] my-1.5 mb-2.5">
      <button 
        class="flex w-full items-center gap-2.5 rounded-xl border border-line-2 bg-surface px-2.5 py-2 shadow-sm transition hover:border-[#D2D6E2] hover:shadow-md"
        @click="isMenuOpen = !isMenuOpen"
      >
        <span 
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-disp text-[13px] font-bold text-white"
          :class="currentProjectData.gradient"
        >
          {{ currentProjectData.initial }}
        </span>
        <span class="flex flex-col items-start overflow-hidden leading-tight">
          <b class="block w-full truncate font-disp text-[13.5px] font-semibold">{{ currentProjectData.name }}</b>
          <small class="text-[10.5px] text-faint">프로젝트 · DEV/QAS/PRD</small>
        </span>
      </button>

      <!-- 스위처 메뉴 (팝오버) -->
      <div 
        v-if="isMenuOpen" 
        class="animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-line-2 bg-surface p-1.5 shadow-lg"
      >
        <div 
          v-for="pj in projects" 
          :key="pj.name"
          class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2"
          @click="selectProject(pj.name)"
        >
          <span 
            class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-disp text-xs font-bold text-white"
            :class="pj.gradient"
          >
            {{ pj.initial }}
          </span>
          <b class="font-disp text-[13px] font-semibold">{{ pj.name }}</b>
        </div>
      </div>
    </div>

    <!-- 네비게이션 메뉴 -->
    <nav class="flex flex-col gap-0.5 overflow-y-auto px-3 py-1">
      <router-link 
        to="/overview" 
        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Box class="h-[17px] w-[17px] opacity-80" />
        <span>대시보드</span>
      </router-link>
      
      <router-link 
        to="/landscape" 
        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Map class="h-[17px] w-[17px] opacity-80" />
        <span>랜드스케이프</span>
        <span class="ml-auto rounded-full border border-line bg-surface-2 px-1.5 py-0 text-[11px] font-semibold text-muted">3</span>
      </router-link>

      <div class="mt-2">
        <button 
          @click="isCheckMenuOpen = !isCheckMenuOpen" 
          class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-semibold text-ink transition hover:bg-surface-2"
        >
          <div class="flex items-center gap-2.5">
            <PlayCircle class="h-[17px] w-[17px] opacity-80 text-muted" />
            <span>검사</span>
          </div>
          <ChevronDown class="h-4 w-4 text-faint transition-transform duration-200" :class="{ '-rotate-90': !isCheckMenuOpen }" />
        </button>
        <div v-show="isCheckMenuOpen" class="mt-0.5 flex flex-col gap-0.5 pl-[28px]">
          <router-link 
            to="/run" 
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>검사 실행</span>
          </router-link>
          <router-link 
            to="/report" 
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>검사 리포트</span>
          </router-link>
        </div>
      </div>

      <div class="mt-1">
        <button 
          @click="isRuleMenuOpen = !isRuleMenuOpen" 
          class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-semibold text-ink transition hover:bg-surface-2"
        >
          <div class="flex items-center gap-2.5">
            <Settings2 class="h-[17px] w-[17px] opacity-80 text-muted" />
            <span>규칙</span>
          </div>
          <ChevronDown class="h-4 w-4 text-faint transition-transform duration-200" :class="{ '-rotate-90': !isRuleMenuOpen }" />
        </button>
        <div v-show="isRuleMenuOpen" class="mt-0.5 flex flex-col gap-0.5 pl-[28px]">
          <router-link 
            to="/rulesets" 
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>적용 규칙</span>
          </router-link>
          <router-link 
            to="/library" 
            class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>규칙 관리</span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- 사이드바 하단 프로필 -->
    <div class="mt-auto flex items-center gap-2.5 border-t border-line px-4 py-3.5">
      <span class="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-[#6E7BF5] to-[#4C5DF0] font-disp text-xs font-bold text-white">
        박
      </span>
      <div class="font-sans text-[12.5px] font-medium leading-tight text-ink">
        박세영<br><small class="font-normal text-faint text-[11px]">Integration Dev</small>
      </div>
    </div>
  </aside>
</template>
