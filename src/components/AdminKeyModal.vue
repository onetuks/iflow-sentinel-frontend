<script setup lang="ts">
import { ref, watch } from 'vue';
import { X, KeyRound } from 'lucide-vue-next';
import { useAdminKey } from '../composables/useAdminKey';

// 배포/언디플로이/삭제 등 파괴적 작업을 보호하는 관리자 키를 입력받는 경량 모달.
// 별도 로그인 없이 localStorage에 키를 저장해두고 매 요청에 헤더로 첨부한다.
const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const { adminKey, setAdminKey } = useAdminKey();
const inputValue = ref('');

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) inputValue.value = adminKey.value;
});

const close = () => emit('update:modelValue', false);

const save = () => {
  setAdminKey(inputValue.value);
  close();
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
            <KeyRound class="h-[18px] w-[18px] text-primary" />
            <h3 class="m-0 font-disp text-[15px] font-bold text-ink">관리자 키 설정</h3>
          </div>
          <button @click="close" class="text-faint transition hover:text-ink">
            <X class="h-[18px] w-[18px]" />
          </button>
        </div>

        <div class="px-5 py-4 text-[13px] text-ink">
          <p class="mb-3 text-muted">
            아티팩트 배포/언디플로이/삭제, 테넌트 삭제 등 실제 SAP CPI 환경을 변경하는 작업에는
            관리자 키가 필요합니다. 발급받은 키를 입력해주세요.
          </p>
          <input
            v-model="inputValue"
            type="password"
            autocomplete="off"
            placeholder="관리자 키 입력"
            class="w-full rounded-[10px] border border-line-2 bg-white px-3 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
            @keyup.enter="save"
          />
        </div>

        <div class="flex justify-end gap-2 border-t border-line px-5 py-4">
          <button
            @click="close"
            class="rounded-[11px] border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1]"
          >
            취소
          </button>
          <button
            @click="save"
            class="rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
