<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  Box,
  Map,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Sliders,
  RefreshCw,
  Plus,
  Trash2,
  Edit2
} from 'lucide-vue-next';
import { apiService } from '../services/api';

const props = defineProps<{
  currentProject: string;
  isOpen: boolean;
  projects?: any[];
}>();

const emit = defineEmits<{
  (e: 'update:project', projectName: string): void;
  (e: 'refresh-projects'): void;
  (e: 'close'): void;
}>();

const isMenuOpen = ref(false);
const isCollapsed = ref(false);

const activePopover = ref<'project' | null>(null);
const popoverTop = ref(0);

// 프로젝트 생성/수정 모달 상태
const showProjectModal = ref(false);
const projectFormMode = ref<'create' | 'edit'>('create');
const currentProjectInput = ref<{ id: number; name: string }>({ id: 0, name: '' });

const handleAddProject = () => {
  projectFormMode.value = 'create';
  currentProjectInput.value = { id: 0, name: '' };
  showProjectModal.value = true;
  isMenuOpen.value = false;
  activePopover.value = null;
};

const handleEditProject = (e: MouseEvent, pj: any) => {
  e.stopPropagation();
  projectFormMode.value = 'edit';
  currentProjectInput.value = { id: pj.id, name: pj.name };
  showProjectModal.value = true;
  isMenuOpen.value = false;
  activePopover.value = null;
};

const handleDeleteProject = async (e: MouseEvent, pj: any) => {
  e.stopPropagation();
  if (confirm(`정말로 '${pj.name}' 프로젝트를 삭제하시겠습니까?`)) {
    try {
      await apiService.deleteProject(pj.id);
      emit('refresh-projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  }
};

const handleSaveProject = async () => {
  if (!currentProjectInput.value.name.trim()) return;
  try {
    if (projectFormMode.value === 'create') {
      const res = await apiService.createProject(currentProjectInput.value.name.trim());
      if (res.data) {
        emit('update:project', res.data.name);
      }
    } else {
      await apiService.updateProject(currentProjectInput.value.id, currentProjectInput.value.name.trim());
      emit('update:project', currentProjectInput.value.name.trim());
    }
    emit('refresh-projects');
    showProjectModal.value = false;
  } catch (err) {
    console.error('Failed to save project:', err);
    alert('프로젝트 저장 중 오류가 발생했습니다.');
  }
};

const toggleMenu = (e: MouseEvent) => {
  if (isCollapsed.value) {
    if (activePopover.value === 'project') {
      activePopover.value = null;
    } else {
      activePopover.value = 'project';
      const btn = e.currentTarget as HTMLElement;
      popoverTop.value = btn.getBoundingClientRect().top;
    }
  } else {
    activePopover.value = null;
    isMenuOpen.value = !isMenuOpen.value;
  }
};

watch(isCollapsed, (newVal) => {
  if (!newVal) activePopover.value = null;
});

const projects = computed(() => props.projects || []);

// 프로젝트 이름 기반 핵심 알파벳/문자 이니셜 추출
const getProjectInitial = (name?: string): string => {
  if (!name) return 'P';
  // 앞단의 특수문자 등을 제거하고 첫 글자 추출
  const cleaned = name.trim().replace(/^[^a-zA-Z0-9가-힣]+/, '');
  const char = cleaned.charAt(0);
  return char ? char.toUpperCase() : 'P';
};

// 고유하고 조화로운 컬러 팔레트 (Tailwind CSS 그라데이션 클래스)
const GRADIENTS = [
  'from-[#6366F1] to-[#4F46E5]', // Indigo
  'from-[#3B82F6] to-[#1D4ED8]', // Blue
  'from-[#0EA5E9] to-[#0284C7]', // Sky
  'from-[#10B981] to-[#059669]', // Emerald
  'from-[#8B5CF6] to-[#6D28D9]', // Purple
  'from-[#EC4899] to-[#BE185D]', // Pink
  'from-[#F59E0B] to-[#D97706]', // Amber
  'from-[#06B6D4] to-[#0891B2]', // Cyan
  'from-[#14B8A6] to-[#0F766E]', // Teal
  'from-[#F43F5E] to-[#E11D48]', // Rose
];

// 프로젝트 이름 문자열 해시를 통해 일관된 배경 색상 결정
const getProjectGradient = (name?: string): string => {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
};

const currentProjectData = computed(() => {
  const found = projects.value.find(p => p.name === props.currentProject) || projects.value[0] || { id: 0, name: props.currentProject || 'Default' };
  const name = found.name || 'Default';
  return {
    ...found,
    name,
    initial: getProjectInitial(name),
    gradient: getProjectGradient(name)
  };
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
        @click="toggleMenu($event)"
      >
        <span 
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-disp text-[13px] font-bold text-white shadow-sm"
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
        class="animate-pop absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-line-2 bg-surface p-1.5 shadow-lg max-h-64 overflow-y-auto"
      >
        <div 
          v-for="pj in projects" 
          :key="pj.name"
          :class="[
            'flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-2 transition group',
            pj.name === props.currentProject ? 'bg-primary-tint/70 text-primary-700 font-semibold' : 'hover:bg-surface-2 text-ink'
          ]"
          @click="selectProject(pj.name)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span 
              class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-disp text-xs font-bold text-white shadow-sm"
              :class="getProjectGradient(pj.name)"
            >
              {{ getProjectInitial(pj.name) }}
            </span>
            <b class="font-disp text-[13px] font-semibold truncate">{{ pj.name }}</b>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="handleEditProject($event, pj)" class="p-1 text-faint hover:text-ink rounded" title="수정">
              <Edit2 class="h-3.5 w-3.5" />
            </button>
            <button @click="handleDeleteProject($event, pj)" class="p-1 text-faint hover:text-fail rounded" title="삭제">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div class="mt-1 border-t border-line pt-1">
          <button 
            @click="handleAddProject" 
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-tint"
          >
            <Plus class="h-3.5 w-3.5" />
            새 프로젝트 추가
          </button>
        </div>
      </div>
    </div>

    <!-- 네비게이션 메뉴 -->
    <nav class="flex flex-col gap-1 overflow-y-auto px-3 py-1 overflow-x-hidden">
      <router-link 
        to="/landscape" 
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2.5 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink relative', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Map class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">랜드스케이프</span>
        <span v-else class="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary"></span>
      </router-link>

      <!-- 핵심 기능 -->
      <router-link
        to="/artifact-tracker"
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2.5 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Package class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">아티팩트 추적</span>
      </router-link>

      <router-link
        to="/property-explorer"
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2.5 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <Sliders class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">프로퍼티 추적</span>
      </router-link>

      <router-link
        to="/message-reprocess"
        @click="activePopover = null"
        :class="['flex items-center rounded-xl py-2.5 font-sans text-[13.5px] font-medium text-muted transition hover:bg-surface-2 hover:text-ink', isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5']"
        active-class="bg-primary-tint font-semibold !text-primary-600"
      >
        <RefreshCw class="h-[17px] w-[17px] opacity-80 shrink-0" />
        <span v-if="!isCollapsed">메시지 재처리</span>
      </router-link>
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
      v-if="isCollapsed && activePopover === 'project'" 
      class="fixed z-[100] left-[84px] w-48 rounded-2xl border border-line bg-surface p-2 shadow-[0_12px_40px_rgba(0,0,0,0.15)] animate-fade"
      :style="{ top: popoverTop + 'px' }"
    >
      <div class="mb-1.5 border-b border-line-2 px-2.5 pb-2 pt-1 flex items-center justify-between">
        <span class="font-disp text-[13px] font-bold text-ink">프로젝트</span>
        <button @click="activePopover = null" class="text-faint hover:text-ink text-xs transition">✕</button>
      </div>

      <div class="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
        <div 
          v-for="pj in projects" 
          :key="pj.name"
          :class="[
            'flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2 py-2 transition group',
            pj.name === props.currentProject ? 'bg-primary-tint/70 text-primary-700 font-semibold' : 'hover:bg-surface-2 text-ink'
          ]"
          @click="selectProject(pj.name)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span 
              class="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-disp text-xs font-bold text-white shadow-sm"
              :class="getProjectGradient(pj.name)"
            >
              {{ getProjectInitial(pj.name) }}
            </span>
            <b class="font-disp text-[13px] font-semibold text-ink truncate">{{ pj.name }}</b>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click="handleEditProject($event, pj)" class="p-1 text-faint hover:text-ink rounded" title="수정">
              <Edit2 class="h-3.5 w-3.5" />
            </button>
            <button @click="handleDeleteProject($event, pj)" class="p-1 text-faint hover:text-fail rounded" title="삭제">
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div class="mt-1 border-t border-line pt-1">
          <button 
            @click="handleAddProject" 
            class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-2 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary-tint"
          >
            <Plus class="h-3.5 w-3.5" />
            새 프로젝트 추가
          </button>
        </div>
      </div>
    </div>

    <!-- 프로젝트 추가/수정 모달 -->
    <div v-if="showProjectModal" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div class="w-full max-w-md animate-fade rounded-2xl border border-line bg-surface p-5 shadow-2xl">
        <h3 class="mb-4 font-disp text-base font-bold text-ink">
          {{ projectFormMode === 'create' ? '새 프로젝트 추가' : '프로젝트 이름 수정' }}
        </h3>
        <input 
          v-model="currentProjectInput.name" 
          type="text" 
          placeholder="프로젝트 이름 입력" 
          class="mb-4 w-full rounded-xl border border-line-2 bg-surface px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          @keyup.enter="handleSaveProject"
          autofocus
        />
        <div class="flex items-center justify-end gap-2">
          <button @click="showProjectModal = false" class="rounded-xl border border-line bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface-2">
            취소
          </button>
          <button @click="handleSaveProject" :disabled="!currentProjectInput.name.trim()" class="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:opacity-50">
            저장
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>
