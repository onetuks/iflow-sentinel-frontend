<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { X, AlertTriangle } from 'lucide-vue-next';

// 프로젝트 전역에서 재사용할 확인 모달.
// 기존 페이지들은 confirm()/alert()만 써왔지만, 메시지 재처리처럼
// 실제 운영 환경에 영향을 주는 액션은 별도 확인 절차가 필요해 새로 도입한다.
const props = defineProps<{
  modelValue: boolean;
  title: string;
  variant?: 'default' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  // 값이 있으면, 입력창에 이 문자열과 정확히 같은 값을 입력해야만 확인 버튼이 활성화된다.
  // (예: PRD 테넌트에 대한 재처리 실행 시 테넌트명을 직접 입력하게 해서 실수를 방지)
  requireTypedText?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const typedText = ref('');

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) typedText.value = '';
});

const isConfirmDisabled = computed(() => {
  if (!props.requireTypedText) return false;
  return typedText.value !== props.requireTypedText;
});

const close = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const confirm = () => {
  if (isConfirmDisabled.value) return;
  emit('confirm');
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4 animate-fade"
      @click.self="close"
    >
      <div class="w-full max-w-md rounded-2xl border border-line bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div class="flex items-center justify-between border-b border-line px-5 py-4">
          <div class="flex items-center gap-2">
            <AlertTriangle v-if="variant === 'danger'" class="h-[18px] w-[18px] text-fail" />
            <h3 class="m-0 font-disp text-[15px] font-bold text-ink">{{ title }}</h3>
          </div>
          <button @click="close" class="text-faint transition hover:text-ink">
            <X class="h-[18px] w-[18px]" />
          </button>
        </div>

        <div class="px-5 py-4 text-[13px] text-ink">
          <slot />

          <div v-if="requireTypedText" class="mt-4">
            <label class="mb-1.5 block text-[12px] font-semibold text-muted">
              계속하려면 <span class="font-mono font-bold text-fail">{{ requireTypedText }}</span> 를 입력하세요
            </label>
            <input
              v-model="typedText"
              type="text"
              class="w-full rounded-[10px] border border-line-2 bg-white px-3 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            @click="close"
            class="rounded-[11px] border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1]"
          >
            {{ cancelLabel || '취소' }}
          </button>
          <button
            @click="confirm"
            :disabled="isConfirmDisabled"
            :class="[
              'rounded-[11px] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40',
              variant === 'danger'
                ? 'bg-fail hover:bg-fail/90'
                : 'bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]'
            ]"
          >
            {{ confirmLabel || '확인' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
