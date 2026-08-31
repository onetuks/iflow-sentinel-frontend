<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ShieldCheck, LoaderCircle } from 'lucide-vue-next';
import { apiService } from '../services/api';
import { useAuth } from '../composables/useAuth';

const route = useRoute();
const router = useRouter();
const { login } = useAuth();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const submit = async () => {
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = '아이디와 비밀번호를 입력해주세요.';
    return;
  }
  errorMessage.value = '';
  isLoading.value = true;
  try {
    const res = await apiService.login(username.value.trim(), password.value);
    login(res.accessToken, res.username);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/landscape';
    router.push(redirect);
  } catch (e: any) {
    errorMessage.value = e?.message || '로그인에 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen w-full items-center justify-center bg-bg px-4">
    <div class="w-full max-w-[380px] rounded-2xl border border-line bg-surface p-8 shadow-lg">
      <div class="mb-7 flex flex-col items-center text-center">
        <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] text-white shadow-sm">
          <ShieldCheck class="h-[22px] w-[22px]" />
        </div>
        <h1 class="font-disp text-lg font-bold text-ink">iFlow Sentinel</h1>
        <p class="mt-1 text-[13px] text-muted">계정으로 로그인하세요</p>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-[12.5px] font-semibold text-muted">아이디</label>
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            placeholder="아이디"
            class="w-full rounded-[10px] border border-line-2 bg-white px-3 py-2.5 text-[13px] text-ink focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-[12.5px] font-semibold text-muted">비밀번호</label>
          <input
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="비밀번호"
            class="w-full rounded-[10px] border border-line-2 bg-white px-3 py-2.5 text-[13px] text-ink focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
        </div>

        <p v-if="errorMessage" class="rounded-[10px] border border-fail-line bg-fail-bg px-3 py-2 text-[12.5px] text-fail">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="isLoading"
          class="mt-2 flex items-center justify-center gap-2 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <LoaderCircle v-if="isLoading" class="h-[15px] w-[15px] animate-spin" />
          {{ isLoading ? '로그인 중…' : '로그인' }}
        </button>
      </form>
    </div>
  </div>
</template>
