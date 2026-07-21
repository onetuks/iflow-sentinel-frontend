<script setup lang="ts">
import { computed } from 'vue';
import { Plus } from 'lucide-vue-next';
import type { AppRule } from '../services/db';

const props = defineProps<{
  mode: string;
  currentRuleId: string;
  scope: string;
  rules?: AppRule[];
}>();

const emit = defineEmits<{
  (e: 'create', scope: string): void;
  (e: 'edit', id: string, isGlobal: boolean): void;
}>();

const globalRules = computed(() => props.rules?.filter(r => r.scopeType === 'global') || []);
const projectRules = computed(() => props.rules?.filter(r => r.scopeType === 'project') || []);

const getSeverityClass = (severity: string) => {
  if (severity === 'FAIL') return 'bg-fail text-white';
  if (severity === 'WARN') return 'bg-warn text-white';
  if (severity === 'INFO') return 'bg-primary text-white';
  return 'bg-surface-2 text-muted';
};

const getSeverityText = (rule: AppRule) => {
  if (rule.ruleType === 'custom-expression' && (rule.severity === 'INFO' || rule.severity === 'WARN')) return '조건식';
  return rule.severity.toUpperCase();
};
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
            v-for="rule in globalRules" :key="rule.id"
            @click="emit('edit', rule.name, true)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === rule.name && scope === 'global') ? 'bg-line-2' : 'hover:bg-surface-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600 truncate mr-2">{{ rule.name }}</span>
            <span :class="['shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold', getSeverityClass(rule.severity)]">{{ getSeverityText(rule) }}</span>
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
            v-for="rule in projectRules" :key="rule.id"
            @click="emit('edit', rule.name, false)"
            :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === rule.name && scope === 'project') ? 'bg-line-2' : 'hover:bg-surface-2']"
          >
            <span class="font-mono text-[12.5px] font-semibold text-primary-600 truncate mr-2">{{ rule.name }}</span>
            <span :class="['shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold', getSeverityClass(rule.severity)]">{{ getSeverityText(rule) }}</span>
          </div>
        </div>
        <button @click="emit('create', 'project')" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
          <Plus class="h-[14px] w-[14px]" /> 새 프로젝트 규칙
        </button>
      </div>
    </div>
  </div>
</template>
