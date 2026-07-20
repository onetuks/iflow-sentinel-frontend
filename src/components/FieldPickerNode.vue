<script setup lang="ts">
import { ref, computed } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import type { SchemaField } from '../utils/schemaTree';

const props = defineProps<{
  field: SchemaField;
  query: string;
  depth?: number;
}>();

const emit = defineEmits<{
  (e: 'insert', field: SchemaField): void;
}>();

const expanded = ref((props.depth ?? 0) < 1);

const hasChildren = computed(() => !!props.field.children?.length);

function selfOrDescendantMatches(f: SchemaField, q: string): boolean {
  if (f.fullPath.toLowerCase().includes(q)) return true;
  return (f.children ?? []).some((c) => selfOrDescendantMatches(c, q));
}

const visibleChildren = computed(() => {
  const children = props.field.children ?? [];
  if (!props.query) return children;
  const q = props.query.toLowerCase();
  return children.filter((c) => selfOrDescendantMatches(c, q));
});

const kindLabel = computed(
  () =>
    ({
      array: '배열',
      object: '객체',
      string: '문자열',
      number: '숫자',
      boolean: '불리언',
      null: 'null'
    }[props.field.kind])
);

const insertHint = computed(() => (props.field.kind === 'array' ? props.field.arraySubjectPath : props.field.itemPath));
</script>

<template>
  <div>
    <div
      class="group flex items-center gap-1 rounded-md py-1 pr-1.5 text-[12px] hover:bg-white"
      :style="{ paddingLeft: `${(depth ?? 0) * 12 + 4}px` }"
    >
      <button
        v-if="hasChildren"
        @click="expanded = !expanded"
        class="flex h-4 w-4 shrink-0 items-center justify-center text-faint hover:text-ink"
      >
        <ChevronRight :class="['h-3 w-3 transition-transform', expanded ? 'rotate-90' : '']" />
      </button>
      <span v-else class="w-4 shrink-0"></span>

      <button
        type="button"
        @click="emit('insert', field)"
        :title="`클릭하여 삽입: ${insertHint}`"
        class="flex-1 truncate rounded px-1 py-0.5 text-left font-mono transition group-hover:bg-primary-tint"
        :class="field.kind === 'array' ? 'font-semibold text-primary-600' : 'text-ink'"
      >
        {{ field.key }}
      </button>
      <span class="shrink-0 rounded border border-line-2 bg-surface px-1.5 py-0.5 text-[9.5px] font-semibold text-faint">
        {{ kindLabel }}
      </span>
    </div>

    <div v-if="hasChildren && expanded">
      <FieldPickerNode
        v-for="child in visibleChildren"
        :key="child.fullPath"
        :field="child"
        :query="query"
        :depth="(depth ?? 0) + 1"
        @insert="(f) => emit('insert', f)"
      />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'FieldPickerNode'
};
</script>
