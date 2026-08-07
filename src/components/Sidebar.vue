<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Box,
  Map,
  ShieldCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Sliders,
  RefreshCw
} from 'lucide-vue-next';

const props = defineProps<{
  currentProject: string;
  isOpen: boolean;
  projects?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:project', projectName: string): void;
  (e: 'close'): void;
}>();

const isMenuOpen = ref(false);
// '검사'와 '규칙'은 별도 그룹이었으나, 규칙 검사 기능 자체가 후순위로 밀리면서
// 하나의 '규칙검사' 그룹으로 통합하고 사이드바 맨 아래로 내렸다.
const isRuleCheckMenuOpen = ref(false);
const isCollapsed = ref(false);

const activePopover = ref<'rulecheck' | 'project' | null>(null);
const popoverTop = ref(0);

const toggleMenu = (e: MouseEvent, menu: 'rulecheck' | 'project') => {
  if (isCollapsed.value) {
    if (activePopover.value === menu) {
      activePopover.value = null;
    } else {
      activePopover.value = menu;
      const btn = e.currentTarget as HTMLElement;
      popoverTop.value = btn.getBoundingClientRect().top;
    }
  } else {
    activePopover.value = null;
    if (menu === 'rulecheck') isRuleCheckMenuOpen.value = !isRuleCheckMenuOpen.value;
    if (menu === 'project') isMenuOpen.value = !isMenuOpen.value;
  }
};

watch(isCollapsed, (newVal) => {
  if (!newVal) activePopover.value = null;
});

const projects = computed(() => props.projects || []);

const currentProjectData = computed(() => {
  return projects.value.find(p => p.name === props.currentProject) || projects.value[0] || {};
});

const selectProject = (projectName: string) => {
  emit('update:project', projectName);
  isMenuOpen.value = false;
  activePopover.value = null;
};
</script>

<template>
  <aside 
    :class="[
      'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-side transition-all duration-300 ease-in-out md:static md:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full',
      isCollapsed ? 'w-[72px]' : 'w-[250px]'
    ]"
  >
    <!-- 브랜드 로고 -->
    <div :class="['flex items-center py-5 pb-3', isCollapsed ? 'justify-center px-0' : 'gap-3 px-5']">
      <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#6E7BF5] via-[#4C5DF0] to-[#3A3FD0] text-white shadow-[0_4px_12px_rgba(76,93,240,0.35)]">
        <Box class="h-[18px] w-[18px]" />
      </span>
      <div v-if="!isCollapsed" class="min-w-0">
        <b class="font-disp text-base font-bold leading-none tracking-tight truncate block">iFlow Sentinel</b>
        <small class="mt-[3px] block font-sans text-[11px] font-medium tracking-wide text-faint truncate">iFlow 관리 도구</small>
      </div>
      <!-- 사이드바 축소/확장 버튼 (데스크탑) -->
      <button v-if="!isCollapsed" class="ml-auto hidden md:block text-faint hover:text-ink transition" @click="isCollapsed = true">
        <PanelLeftClose class="h-[18px] w-[18px]" />
      </button>
      <button v-else class="absolute top-6 right-[-12px] hidden md:flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-sm text-faint hover:text-ink transition z-50" @click="isCollapsed = false">
        <PanelLeftOpen class="h-3.5 w-3.5" />
      </button>
      <!-- 모바일 닫기 버튼 -->
      <button class="ml-auto block md:hidden" @click="$emit('close')">X</button>
    </div>

    <!-- 프로젝트 스위처 -->
    <div :class="['relative my-1.5 mb-2.5', isCollapsed ? 'mx-3' : 'mx-[14px]']">
      <button 
        :class="['flex w-full items-center rounded-xl border border-line-2 bg-surface py-2 shadow-sm transition hover:border-[#D2D6E2] hover:shadow-md', (isCollapsed && activePopover === 'project') ? 'border-[#D2D6E2] shadow-md' : '', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        @click="toggleMenu($event, 'project')"
      >
        <span 
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-disp text-[13px] font-bold text-white"
          :class="currentProjectData.gradient"
        >
          {{ currentProjectData.initial }}
        </span>
        <span v-if="!isCollapsed" class="flex flex-col items-start overflow-hidden leading-tight flex-1">
          <b class="block w-full truncate text-left font-disp text-[13.5px] font-semibold">{{ currentProjectData.name }}</b>
          <small class="text-[10.5px] text-faint">프로젝트</small>
        </span>
      </button>

      <!-- 스위처 메뉴 (팝오버) -->
      <div 
        v-show="!isCollapsed && isMenuOpen" 
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
    <nav class="flex flex-col gap-0.5 overflow-y-auto px-3 py-1 overflow-x-hidden">
      <router-link 
        to="/overview" 
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Box class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">대시보드</span>
      </router-link>
      
      <router-link 
        to="/landscape" 
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink relative', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Map class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">랜드스케이프</span>
        <span v-else class="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
      </router-link>

      <!-- 핵심 기능: 기능 단위로 독립된 최상위 메뉴 (더 이상 '아티팩트' 하위로 묶지 않음) -->
      <router-link
        to="/artifact-tracker"
        @click="activePopover = null"
        :class="['mt-2 flex items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Package class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">아티팩트 추적</span>
      </router-link>

      <router-link
        to="/property-explorer"
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Sliders class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">프로퍼티 추적</span>
      </router-link>

      <router-link
        to="/message-reprocess"
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <RefreshCw class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">메시지 재처리</span>
      </router-link>

      <!-- 규칙검사 (후순위): 원래 별도였던 '검사'/'규칙' 그룹과 Parser 탐색기를 통합하고
           맨 아래로 내려 시각적으로 옅게 표시한다. 항목은 계속 클릭 가능하다. -->
      <div class="mt-3 relative border-t border-line pt-3">
        <button
          @click="toggleMenu($event, 'rulecheck')"
          :class="['flex w-full items-center rounded-xl py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2', (isCollapsed && activePopover === 'rulecheck') ? 'bg-surface-2' : '', isCollapsed ? 'justify-center px-0' : 'justify-between px-2.5']"
        >
          <div :class="['flex items-center', isCollapsed ? 'justify-center' : 'gap-2.5']">
            <ShieldCheck class="h-[17px] w-[17px] opacity-70 shrink-0" />
            <span v-if="!isCollapsed" class="flex items-center gap-1.5">
              규칙검사
              <span class="rounded-full border border-line-2 bg-surface-2 px-1.5 py-0 text-[10px] font-semibold text-faint">준비중</span>
            </span>
          </div>
          <ChevronDown v-if="!isCollapsed" class="h-4 w-4 text-faint transition-transform duration-200" :class="{ '-rotate-90': !isRuleCheckMenuOpen }" />
        </button>
        <div v-show="!isCollapsed && isRuleCheckMenuOpen" class="mt-0.5 flex flex-col gap-0.5 pl-[28px]">
          <router-link
            to="/run"
            class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>검사 실행</span>
          </router-link>
          <router-link
            to="/report"
            class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>검사 리포트</span>
          </router-link>
          <router-link
            to="/rulesets"
            class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>적용 규칙</span>
          </router-link>
          <router-link
            to="/library"
            class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>규칙 관리</span>
          </router-link>
          <router-link
            to="/parser-explorer"
            class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
            active-class="bg-primary-tint font-semibold !text-primary-600"
          >
            <span>Parser 탐색기</span>
          </router-link>
        </div>
      </div>
    </nav>

    <!-- 사이드바 하단 프로필 -->
    <div :class="['mt-auto flex items-center border-t border-line py-3.5', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-4']">
      <span class="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6E7BF5] to-[#4C5DF0] font-disp text-xs font-bold text-white">
        박
      </span>
      <div v-if="!isCollapsed" class="font-sans text-[12.5px] font-medium leading-tight text-ink min-w-0">
        <span class="truncate block">박세영</span><small class="font-normal text-faint text-[11px] truncate block">Integration Dev</small>
      </div>
    </div>

    <!-- 팝오버 모달 (축소 시) -->
    <div 
      v-if="isCollapsed && activePopover" 
      class="fixed z-[100] left-[84px] w-48 rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_rgba(0,0,0,0.15)] animate-fade"
      :style="{ top: popoverTop + 'px' }"
    >
      <div class="mb-1.5 border-b border-line-2 px-2.5 pb-2 pt-1 flex items-center justify-between">
        <span class="font-disp text-[13px] font-bold text-ink">
          {{ activePopover === 'rulecheck' ? '규칙검사' : '프로젝트' }}
        </span>
        <button @click="activePopover = null" class="text-faint hover:text-ink text-xs transition">✕</button>
      </div>

      <div v-if="activePopover === 'rulecheck'" class="flex flex-col gap-0.5">
        <router-link to="/run" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink" active-class="bg-primary-tint font-semibold !text-primary-600" @click="activePopover = null"><span>검사 실행</span></router-link>
        <router-link to="/report" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink" active-class="bg-primary-tint font-semibold !text-primary-600" @click="activePopover = null"><span>검사 리포트</span></router-link>
        <router-link to="/rulesets" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink" active-class="bg-primary-tint font-semibold !text-primary-600" @click="activePopover = null"><span>적용 규칙</span></router-link>
        <router-link to="/library" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink" active-class="bg-primary-tint font-semibold !text-primary-600" @click="activePopover = null"><span>규칙 관리</span></router-link>
        <router-link to="/parser-explorer" class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink" active-class="bg-primary-tint font-semibold !text-primary-600" @click="activePopover = null"><span>Parser 탐색기</span></router-link>
      </div>

      <div v-else-if="activePopover === 'project'" class="flex flex-col gap-0.5">
        <div 
          v-for="pj in projects" 
          :key="pj.name"
          class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-surface-2 transition"
          @click="selectProject(pj.name)"
        >
          <span 
            class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-disp text-xs font-bold text-white"
            :class="pj.gradient"
          >
            {{ pj.initial }}
          </span>
          <b class="font-disp text-[13px] font-semibold text-ink">{{ pj.name }}</b>
        </div>
      </div>
    </div>
  </aside>
</template>
