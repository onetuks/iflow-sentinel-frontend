<script setup lang="ts">
import { useTaskHub } from '../composables/useTaskHub';
import { 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Trash2, 
  Clock,
  Sparkles
} from 'lucide-vue-next';

const {
  tasks,
  activeTasks,
  hasTasks,
  isMinimized,
  dismissTask,
  clearFinishedTasks,
  toggleMinimize
} = useTaskHub();

const formatTime = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}초`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}분 ${secs}초`;
};
</script>

<template>
  <div v-if="hasTasks" class="fixed bottom-6 right-6 z-50 transition-all duration-300 animate-fade">
    <!-- 1. 최소화 모드 (Pill Badge) -->
    <div 
      v-if="isMinimized" 
      @click="toggleMinimize"
      class="group flex items-center gap-3 rounded-full border border-line-2 bg-surface/95 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-primary/10 cursor-pointer"
    >
      <div class="relative flex items-center justify-center">
        <RotateCw v-if="activeTasks.length > 0" class="h-4 w-4 animate-spin text-primary" />
        <Sliders v-else class="h-4 w-4 text-ink" />
        <span 
          v-if="activeTasks.length > 0" 
          class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-xs"
        >
          {{ activeTasks.length }}
        </span>
      </div>

      <div class="flex items-center gap-2 text-[12px] font-bold text-ink">
        <span v-if="activeTasks.length > 0">
          작업 처리 중 ({{ activeTasks.length }}건)
        </span>
        <span v-else class="text-muted">
          작업 완료 ({{ tasks.length }}건)
        </span>
      </div>

      <ChevronUp class="h-3.5 w-3.5 text-muted transition-transform group-hover:text-ink" />
    </div>

    <!-- 2. 펼침 모드 (Floating Task Window) -->
    <div 
      v-else 
      class="w-[380px] sm:w-[420px] rounded-2xl border border-line bg-surface/95 shadow-2xl backdrop-blur-md overflow-hidden animate-scale-up"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-line bg-surface-2/40 px-4 py-3">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-tint text-primary">
            <Sliders class="h-4 w-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-disp text-[13px] font-bold text-ink">백그라운드 작업</span>
              <span 
                v-if="activeTasks.length > 0" 
                class="rounded-full bg-primary-tint px-2 py-0.5 text-[10.5px] font-bold text-primary animate-pulse"
              >
                {{ activeTasks.length }}건 진행 중
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <button 
            v-if="tasks.length > activeTasks.length"
            @click="clearFinishedTasks" 
            class="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-muted hover:bg-surface-2 hover:text-ink transition cursor-pointer"
            title="완료된 작업 모두 지우기"
          >
            <Trash2 class="h-3 w-3" />
            <span>완료 정리</span>
          </button>
          <button 
            @click="toggleMinimize" 
            class="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink transition cursor-pointer"
            title="최소화"
          >
            <ChevronDown class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Task Items List -->
      <div class="max-h-[360px] overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
        <div 
          v-for="task in tasks" 
          :key="task.id" 
          :class="[
            'rounded-xl border p-3 transition-all',
            task.status === 'RUNNING' 
              ? 'border-primary/30 bg-primary-tint/20 shadow-xs' 
              : task.status === 'SUCCESS' 
                ? 'border-pass-line/60 bg-pass-bg/40' 
                : 'border-fail/30 bg-fail-bg/40'
          ]"
        >
          <!-- Task Item Header -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="truncate font-disp text-[12.5px] font-bold text-ink">
                {{ task.tenantName }}
              </span>
              <span class="shrink-0 rounded-md bg-surface border border-line-2 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-primary">
                → {{ task.targetLevel }}
              </span>
            </div>

            <!-- Task Status Indicator -->
            <div class="flex items-center gap-2 shrink-0">
              <div v-if="task.status === 'RUNNING'" class="flex items-center gap-1 text-[11px] font-mono font-bold text-primary">
                <RotateCw class="h-3.5 w-3.5 animate-spin" />
                <span class="flex items-center gap-0.5">
                  <Clock class="h-3 w-3 inline" />
                  {{ formatTime(task.elapsedSeconds) }}
                </span>
              </div>
              <div v-else-if="task.status === 'SUCCESS'" class="flex items-center gap-1 text-[11px] font-bold text-pass">
                <CheckCircle2 class="h-3.5 w-3.5" />
                <span>완료</span>
              </div>
              <div v-else class="flex items-center gap-1 text-[11px] font-bold text-fail">
                <AlertCircle class="h-3.5 w-3.5" />
                <span>실패</span>
              </div>

              <!-- Individual Task Dismiss Button (if finished) -->
              <button 
                v-if="task.status !== 'RUNNING'"
                @click="dismissTask(task.id)"
                class="rounded p-1 text-muted hover:bg-surface hover:text-ink transition cursor-pointer"
                title="목록에서 제거"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Task Message / Description -->
          <div class="mt-2 text-[11.5px] leading-relaxed">
            <div v-if="task.status === 'RUNNING'" class="flex items-center gap-1.5 text-muted">
              <span class="h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
              <span>배포된 아티팩트에 Log Level을 반영하고 있습니다...</span>
            </div>
            <div v-else :class="task.status === 'SUCCESS' ? 'text-pass font-medium' : 'text-fail font-medium'">
              {{ task.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="border-t border-line bg-surface-2/20 px-3.5 py-2 text-[11px] text-muted flex items-center justify-between">
        <span class="flex items-center gap-1">
          <Sparkles class="h-3 w-3 text-primary" />
          창을 닫거나 다른 메뉴로 이동해도 안전하게 진행됩니다
        </span>
        <button @click="toggleMinimize" class="text-primary font-bold hover:underline cursor-pointer">
          접기
        </button>
      </div>
    </div>
  </div>
</template>
