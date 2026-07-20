<script setup lang="ts">
import { inject, useId } from 'vue';
import { Plus } from 'lucide-vue-next';
import type { SubjectField } from '../utils/schemaTree';

export interface ConditionItem {
  type: 'condition';
  subject: string;
  filter: string;
  method: string;
  operator: string;
  value: string;
}

export interface ConditionGroup {
  type: 'group';
  logic: 'AND' | 'OR';
  children: Array<ConditionItem | ConditionGroup>;
}

export type ActiveFieldKey = 'subject' | 'filter' | 'value';

const props = defineProps<{
  node: ConditionGroup;
  isRoot?: boolean;
  subjects: SubjectField[];
}>();

const emit = defineEmits<{
  (e: 'remove'): void;
}>();

// RuleForm이 제공하는, "필드 선택기에서 클릭한 필드를 어디에 꽂을지" 추적하는 콜백
const registerActiveField = inject<((target: ConditionItem, key: ActiveFieldKey) => void) | undefined>(
  'registerActiveField',
  undefined
);

const itemFieldsFor = (subject: string) => props.subjects.find((s) => s.path === subject)?.itemFields ?? [];

// 중첩된 그룹이 재귀 렌더링되어도 datalist id가 서로 겹치지 않도록 인스턴스 단위 고유 id를 부여
const instanceId = useId();
const filterListId = (idx: number) => `filter-fields-${instanceId}-${idx}`;

const addCondition = () => {
  props.node.children.push({
    type: 'condition',
    subject: 'steps',
    filter: '',
    method: 'size()',
    operator: '==',
    value: '0'
  });
};

const addGroup = () => {
  props.node.children.push({
    type: 'group',
    logic: 'AND',
    children: [
      {
        type: 'condition',
        subject: 'steps',
        filter: '',
        method: 'size()',
        operator: '==',
        value: '0'
      }
    ]
  });
};

const removeChild = (index: number) => {
  props.node.children.splice(index, 1);
};
</script>

<template>
  <div :class="['relative rounded-xl border p-3 sm:p-4 overflow-x-auto', isRoot ? 'border-line bg-surface-2' : 'border-[#E1E5FD] bg-white shadow-sm mt-3']">
    
    <!-- 그룹 상단 (논리 연산자 토글 및 그룹 삭제) -->
    <div class="mb-3 flex items-center justify-between">
      <div class="flex overflow-hidden rounded-lg border border-[#D5DAFB] bg-surface-2 p-0.5">
        <button 
          @click="node.logic = 'AND'" 
          :class="['px-3 py-1 text-[11px] font-bold transition-colors rounded-md', node.logic === 'AND' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink']"
        >
          AND
        </button>
        <button 
          @click="node.logic = 'OR'" 
          :class="['px-3 py-1 text-[11px] font-bold transition-colors rounded-md', node.logic === 'OR' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink']"
        >
          OR
        </button>
      </div>
      
      <button v-if="!isRoot" @click="emit('remove')" class="text-[12px] font-semibold text-faint hover:text-fail transition">
        그룹 삭제
      </button>
    </div>

    <!-- Children 랜더링 -->
    <div class="flex flex-col">
      <div v-for="(child, idx) in node.children" :key="idx" class="relative">
        
        <!-- 구분자 (AND / OR) -->
        <div v-if="idx > 0" class="my-2 flex items-center justify-center">
          <span class="rounded-full bg-[#E1E5FD] px-2.5 py-0.5 text-[10px] font-bold text-primary-600 shadow-sm">
            {{ node.logic }}
          </span>
        </div>

        <!-- 단일 조건 -->
        <div v-if="child.type === 'condition'" class="group flex flex-nowrap items-center gap-1.5 rounded-lg border border-line bg-white p-1.5 shadow-sm overflow-x-auto hide-scrollbar">
          <select
            v-model="child.subject"
            @focus="registerActiveField?.(child, 'subject')"
            class="shrink-0 rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] md:text-[12px] focus:border-primary focus:outline-none"
          >
            <optgroup label="파싱 모델 필드">
              <option v-for="s in subjects" :key="s.path" :value="s.path">{{ s.path }}</option>
            </optgroup>
            <optgroup label="런타임 값">
              <option value="properties">properties</option>
            </optgroup>
          </select>
          <input
            type="text"
            v-model="child.filter"
            @focus="registerActiveField?.(child, 'filter')"
            :list="filterListId(idx)"
            placeholder="필터 (예: type == &quot;mapping&quot;)"
            class="min-w-[120px] shrink-0 grow rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] md:text-[12px] focus:border-primary focus:outline-none"
          />
          <datalist :id="filterListId(idx)">
            <option v-for="f in itemFieldsFor(child.subject)" :key="f.path" :value="`${f.path} == `" />
          </datalist>
          <select v-model="child.method" class="shrink-0 rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] md:text-[12px] focus:border-primary focus:outline-none">
            <option value="size()">size()</option>
            <option value="exists()">exists()</option>
          </select>
          <select v-model="child.operator" class="shrink-0 rounded-md border border-line bg-surface px-1.5 py-1 font-mono text-[11px] md:text-[12px] focus:border-primary focus:outline-none">
            <option value="<=">&lt;=</option>
            <option value="==">==</option>
            <option value=">=">&gt;=</option>
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
          </select>
          <input
            type="text"
            v-model="child.value"
            @focus="registerActiveField?.(child, 'value')"
            class="shrink-0 w-12 md:w-16 rounded-md border border-line bg-surface px-1.5 py-1 text-center font-mono text-[11px] md:text-[12px] focus:border-primary focus:outline-none"
          />

          <button @click="removeChild(idx)" class="ml-auto flex shrink-0 h-[24px] w-[24px] items-center justify-center rounded-md text-faint hover:bg-fail-bg hover:text-fail transition">
            ✕
          </button>
        </div>

        <!-- 하위 그룹 (재귀 호출) -->
        <ConditionNode v-else-if="child.type === 'group'" :node="child" :subjects="subjects" @remove="removeChild(idx)" />
      </div>
    </div>

    <!-- 하단 액션 버튼 -->
    <div class="mt-4 flex items-center gap-2 border-t border-line border-dashed pt-3">
      <button @click="addCondition" class="flex items-center gap-1.5 rounded-lg border border-line-2 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
        <Plus class="h-[13px] w-[13px]" /> 조건 추가
      </button>
      <button @click="addGroup" class="flex items-center gap-1.5 rounded-lg border border-primary-tint bg-primary-tint px-3 py-1.5 text-[11.5px] font-semibold text-primary-600 transition hover:bg-[#D5DAFB]">
        <Plus class="h-[13px] w-[13px]" /> 그룹(괄호) 추가
      </button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'ConditionNode'
}
</script>
