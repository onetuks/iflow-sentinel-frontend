<script setup lang="ts">
import { ref, computed } from 'vue';
import { Info, Library } from 'lucide-vue-next';

interface LocalRule {
  id: string;
  name: string;
  scope: '전역 규칙' | '프로젝트 규칙';
  scopeType: 'global' | 'project';
  description: string;
  enabled: boolean;
  statusText: string;
  statusClass: string;
}

const rules = ref<LocalRule[]>([
  { id: '1', name: 'sender-naming', scope: '프로젝트 규칙', scopeType: 'project', description: '접두사에 SOIL_ 추가 · 전역 원본(OP_/B2B_/CP_)은 꺼짐', enabled: true, statusText: '프로젝트 규칙', statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600' },
  { id: '2', name: 'required-logging', scope: '프로젝트 규칙', scopeType: 'project', description: '심각도 warn (전역 fail 대신 이 프로젝트 전용 값 사용)', enabled: true, statusText: '프로젝트 규칙', statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600' },
  { id: '3', name: 'soil-system-code-whitelist', scope: '프로젝트 규칙', scopeType: 'project', description: '전역에 없음 · SOIL_ERP, SOIL_MES 시스템 코드만 허용', enabled: true, statusText: '프로젝트 규칙', statusClass: 'border-pass-line bg-pass-bg text-pass' },
  { id: '4', name: 'mapping-step-limit', scope: '프로젝트 규칙', scopeType: 'project', description: '사용자 정의 조건식 · 매핑 스텝 5개 초과 시 warn', enabled: true, statusText: '프로젝트 규칙', statusClass: 'border-pass-line bg-pass-bg text-pass' },
  { id: '5', name: 'allowed-script-language', scope: '전역 규칙', scopeType: 'global', description: 'Groovy만 허용 · fail', enabled: true, statusText: '전역 규칙', statusClass: 'border-line-2 bg-surface-2 text-muted' },
  { id: '6', name: 'no-hardcoded-endpoint', scope: '전역 규칙', scopeType: 'global', description: '엔드포인트 외부화 필수 · fail', enabled: true, statusText: '전역 규칙', statusClass: 'border-line-2 bg-surface-2 text-muted' },
  { id: '7', name: 'must-have-error-handler', scope: '전역 규칙', scopeType: 'global', description: '예외 처리 서브프로세스 필수 · warn', enabled: true, statusText: '전역 규칙', statusClass: 'border-line-2 bg-surface-2 text-muted' },
  { id: '8', name: 'processdirect-pairing', scope: '전역 규칙', scopeType: 'global', description: 'PD 송·수신 짝 검증 · warn', enabled: false, statusText: '전역 규칙', statusClass: 'border-line-2 bg-surface-2 text-muted' },
]);

const globalOnCount = computed(() => rules.value.filter(r => r.scopeType === 'global' && r.enabled).length);
const projectOnCount = computed(() => rules.value.filter(r => r.scopeType === 'project' && r.enabled).length);
</script>

<template>
  <div class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">적용 규칙</h1>
        <div class="mt-1 text-[13px] text-muted">이 프로젝트가 사용하는 규칙 {{ globalOnCount + projectOnCount }}개 (전역 {{ globalOnCount }} · 프로젝트 {{ projectOnCount }})</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Library class="h-[15px] w-[15px]" />
          프로젝트 규칙 만들기
        </button>
      </div>
    </div>

    <!-- 안내 메시지 -->
    <div class="mb-5 flex items-start gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
      <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
      <span>규칙셋(묶음) 개념은 없습니다. <b>전역 규칙</b>과 <b>프로젝트 규칙</b> 각각을 이 프로젝트에서 사용할지 개별적으로 선택합니다. 전역 값을 다르게 쓰고 싶으면 전역 규칙을 끄고, 원하는 값으로 프로젝트 규칙을 새로 만들어 켜면 됩니다 — 전역 원본은 바뀌지 않습니다.</span>
    </div>

    <div class="rounded-2xl border border-line bg-surface shadow-md">
      <!-- 헤더 -->
      <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <h3 class="m-0 font-disp text-[14.5px] font-semibold">적용 규칙 현황</h3>
        <span class="text-xs font-medium text-faint">전역 {{ globalOnCount }} · 프로젝트 {{ projectOnCount }}</span>
      </div>
      
      <!-- 테이블 헤더 (데스크탑에서만 보임) -->
      <div class="hidden grid-cols-[1fr_150px_1.3fr_70px_64px] gap-2.5 border-b border-line px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint lg:grid">
        <span>규칙</span>
        <span>범위</span>
        <span>이 프로젝트 적용 내용</span>
        <span class="text-center">사용</span>
        <span></span>
      </div>

      <!-- 규칙 목록 -->
      <div class="divide-y divide-line">
        <div 
          v-for="rule in rules" 
          :key="rule.id" 
          :class="['grid grid-cols-1 items-center gap-3 px-5 py-3.5 transition-opacity duration-200 lg:grid-cols-[1fr_150px_1.3fr_70px_64px] lg:gap-2.5', !rule.enabled ? 'opacity-50' : 'opacity-100']"
        >
          <!-- 1. 규칙 이름 -->
          <div class="flex items-center">
            <span class="font-mono text-[12.5px] font-semibold text-primary-600">{{ rule.name }}</span>
          </div>
          
          <!-- 2. 범위 뱃지 -->
          <div>
            <span :class="['inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-semibold', rule.statusClass]">
              {{ rule.statusText }}
            </span>
          </div>
          
          <!-- 3. 설명 -->
          <div class="text-[12.5px] text-muted">{{ rule.description }}</div>
          
          <!-- 4. 토글 스위치 -->
          <div class="flex items-center justify-center lg:justify-center">
            <label class="relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center">
              <input type="checkbox" v-model="rule.enabled" class="peer sr-only" />
              <div class="peer h-[22px] w-[38px] rounded-full bg-line-2 transition-colors peer-checked:bg-primary"></div>
              <div class="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </label>
          </div>
          
          <!-- 5. 액션 -->
          <div class="flex justify-end lg:justify-end">
            <button class="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">편집</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
