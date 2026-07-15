<script setup lang="ts">
import { Plus } from 'lucide-vue-next';

defineProps<{
  mode: string;
  currentRuleId: string;
  scope: string;
}>();

const emit = defineEmits<{
  (e: 'create', scope: string): void;
  (e: 'edit', id: string, isGlobal: boolean): void;
}>();
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface shadow-md">
    <div class="border-b border-line px-5 py-3.5">
      <h3 class="m-0 font-disp text-[14.5px] font-semibold">규칙 목록</h3>
    </div>
    <div class="p-4">
      <!-- 전역 규칙 -->
      <div class="mb-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-[12px] font-semibold text-[#3B4257]">전역 규칙</span>
          <span class="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">라이브러리</span>
        </div>
        <div class="flex flex-col gap-1">
          <div 
            @click="emit('edit', 'sender-naming', true)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'sender-naming' && scope === 'global') ? 'bg-line-2' : 'bg-surface-2 hover:bg-line-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600">sender-naming</span>
            <span class="rounded-sm bg-fail px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">FAIL</span>
          </div>
          <div 
            @click="emit('edit', 'required-logging', true)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'required-logging' && scope === 'global') ? 'bg-line-2' : 'hover:bg-surface-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600">required-logging</span>
            <span class="rounded-sm bg-fail px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">FAIL</span>
          </div>
          <div 
            @click="emit('edit', 'must-have-error', true)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'must-have-error' && scope === 'global') ? 'bg-line-2' : 'hover:bg-surface-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600">must-have-error</span>
            <span class="rounded-sm bg-warn px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">WARN</span>
          </div>
        </div>
        <button @click="emit('create', 'global')" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
          <Plus class="h-[14px] w-[14px]" /> 새 전역 규칙
        </button>
      </div>

      <!-- 프로젝트 규칙 -->
      <div>
        <div class="mb-2 flex items-center justify-between">
          <span class="text-[12px] font-semibold text-[#3B4257]">프로젝트 규칙</span>
          <span class="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-primary-600">S-Oil IS 전환</span>
        </div>
        <div class="flex flex-col gap-1">
          <div 
            @click="emit('edit', 'mapping-limit', false)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'mapping-limit' && scope === 'project') ? 'bg-line-2' : 'hover:bg-surface-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600 truncate mr-2">mapping-limit</span>
            <span class="shrink-0 rounded-sm bg-pass-bg border border-pass-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-pass">조건식</span>
          </div>
        </div>
        <button @click="emit('create', 'project')" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
          <Plus class="h-[14px] w-[14px]" /> 새 프로젝트 규칙
        </button>
      </div>
    </div>
  </div>
</template>
