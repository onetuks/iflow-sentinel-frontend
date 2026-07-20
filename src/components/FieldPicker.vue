<script setup lang="ts">
import { ref, computed } from 'vue';
import { Search, Workflow, Loader2 } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import FieldPickerNode from './FieldPickerNode.vue';
import type { SchemaField } from '../utils/schemaTree';

export interface FieldPickerArtifact {
  id: string;
  name: string;
  package?: string;
}

const props = defineProps<{
  fields: SchemaField[];
  artifacts?: FieldPickerArtifact[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'insert', field: SchemaField): void;
}>();

const selectedArtifactId = defineModel<string>('artifactId');

const query = ref('');

function selfOrDescendantMatches(f: SchemaField, q: string): boolean {
  if (f.fullPath.toLowerCase().includes(q)) return true;
  return (f.children ?? []).some((c) => selfOrDescendantMatches(c, q));
}

const filteredFields = computed(() => {
  if (!query.value) return props.fields;
  const q = query.value.toLowerCase();
  return props.fields.filter((f) => selfOrDescendantMatches(f, q));
});
</script>

<template>
  <div class="flex w-full flex-col rounded-xl border border-line-2 bg-surface-2 sm:w-[260px] sm:shrink-0">
    <div class="space-y-2 border-b border-line-2 p-2.5">
      <select
        v-if="artifacts?.length"
        v-model="selectedArtifactId"
        class="w-full rounded-lg border border-line-2 bg-white px-2 py-1.5 text-[12px] text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
      >
        <option v-for="a in artifacts" :key="a.id" :value="a.id">{{ a.name }}</option>
      </select>
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        <input
          v-model="query"
          type="text"
          placeholder="필드 검색 (예: type, mapping.name)"
          class="w-full rounded-lg border border-line-2 bg-white py-1.5 pl-8 pr-2.5 text-[12px] text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
      </div>
    </div>

    <div class="max-h-[260px] overflow-y-auto p-1.5">
      <div v-if="loading" class="flex items-center justify-center gap-1.5 p-4 text-[12px] text-faint">
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        파싱 모델을 불러오는 중...
      </div>
      <template v-else>
        <FieldPickerNode
          v-for="field in filteredFields"
          :key="field.fullPath"
          :field="field"
          :query="query"
          @insert="(f) => emit('insert', f)"
        />
        <div v-if="!filteredFields.length" class="p-3 text-center text-[12px] text-faint">일치하는 필드가 없습니다.</div>
      </template>
    </div>

    <div class="flex items-center gap-1.5 border-t border-line-2 px-2.5 py-2 text-[11px] text-faint">
      <Workflow class="h-3 w-3 shrink-0" />
      <span class="truncate">선택 아티팩트의 파싱 모델 기준</span>
      <RouterLink to="/parser-explorer" class="ml-auto shrink-0 font-semibold text-primary-600 hover:underline">
        전체 보기
      </RouterLink>
    </div>
  </div>
</template>
