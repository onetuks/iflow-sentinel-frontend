<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { CheckRun, Finding, Tenant } from '../types';
import { PlayCircle, ShieldAlert, Layers, CheckCircle2, AlertTriangle } from 'lucide-vue-next';

// 1. 화면에 바인딩할 데이터 상태 변수 선언
const tenants = ref<Tenant[]>([]);
const checkRuns = ref<CheckRun[]>([]);
const topFindings = ref<Finding[]>([]);
const isLoading = ref(true);

// 2. 컴포넌트 마운트 시 더미 데이터 불러오기
onMounted(async () => {
  isLoading.value = true;
  const projectId = 'p1'; // 임시 프로젝트 ID
  
  // 병렬로 API 호출 시뮬레이션
  const [tData, cData, fData] = await Promise.all([
    apiService.getTenants(projectId),
    apiService.getCheckRuns(projectId),
    apiService.getTopFindings()
  ]);
  
  tenants.value = tData;
  checkRuns.value = cData;
  topFindings.value = fData;
  isLoading.value = false;
});

// 환경별 배지 색상 함수
const getEnvBadgeClass = (env: string) => {
  if (env === 'DEV') return 'bg-[#EEF0FE] text-dev';
  if (env === 'QAS') return 'bg-warn-bg text-qas';
  if (env === 'PRD') return 'bg-pass-bg text-prd';
  return 'bg-surface-2 text-muted';
};
</script>

<template>
  <div v-if="isLoading" class="flex h-64 items-center justify-center">
    <!-- 로딩 스피너 -->
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="animate-fade">
    <!-- 1. 페이지 헤더 (타이틀 및 액션 버튼) -->
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">대시보드</h1>
        <div class="mt-1 text-[13px] text-muted">S-Oil IS 전환 · 랜드스케이프 상태와 최근 검사</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <PlayCircle class="h-[15px] w-[15px]" />
          새 검사 실행
        </button>
      </div>
    </div>

    <!-- 2. 랜드스케이프 파이프라인 영역 -->
    <div class="mb-5 flex flex-col md:flex-row items-stretch gap-0">
      <template v-for="(tenant, index) in tenants" :key="tenant.id">
        <!-- 테넌트 박스 -->
        <div class="relative flex-1 rounded-2xl border border-line bg-surface p-4.5 shadow-md">
          <div class="mb-3 flex items-center gap-2">
            <span :class="['rounded-md px-2 py-1 font-mono text-[11px] font-semibold tracking-wide', getEnvBadgeClass(tenant.environment)]">
              {{ tenant.environment }}
            </span>
            <span class="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
              <i :class="['h-1.5 w-1.5 rounded-full shadow-[0_0_0_3px]', tenant.status === 'connected' ? 'bg-pass shadow-pass-bg' : 'bg-fail shadow-fail-bg']"></i>
              {{ tenant.status === 'connected' ? '연결됨' : '오류' }}
            </span>
          </div>
          <div class="mb-3.5 truncate font-mono text-[11.5px] text-muted">{{ tenant.odataUrl }}</div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11.5px] font-semibold border-pass-line bg-pass-bg text-pass">
              {{ tenant.status === 'connected' ? '통과' : '보류' }}
            </span>
            <small class="text-[11px] text-faint">{{ tenant.lastChecked }}</small>
          </div>
        </div>
        <!-- 연결선 (마지막 요소 제외) -->
        <div v-if="index < tenants.length - 1" class="flex w-8 shrink-0 items-center justify-center text-faint md:w-8 hidden md:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
      </template>
    </div>

    <!-- 3. 주요 통계 카드 (Grid 적용) -->
    <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary-tint-2 text-primary">
            <CheckCircle2 class="h-3.5 w-3.5" />
          </span>
          QAS 통과율
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight">
          82<small class="text-sm font-semibold text-faint">%</small>
        </div>
        <div class="mt-3 flex h-1.5 overflow-hidden rounded-full bg-line">
          <i class="h-full bg-pass" style="width: 82%"></i>
          <i class="h-full bg-fail-line" style="width: 18%"></i>
        </div>
      </div>
      
      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-fail-bg text-fail">
            <ShieldAlert class="h-3.5 w-3.5" />
          </span>
          열린 위반
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight text-fail">
          2<small class="text-sm font-semibold text-warn"> / 3 warn</small>
        </div>
        <div class="mt-3 flex h-1.5 overflow-hidden rounded-full bg-line">
          <i class="h-full bg-fail" style="width: 20%"></i>
          <i class="h-full bg-warn" style="width: 30%"></i>
          <i class="h-full bg-pass-line" style="width: 50%"></i>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary-tint-2 text-primary">
            <Layers class="h-3.5 w-3.5" />
          </span>
          랜드스케이프
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight">
          3<small class="text-sm font-semibold text-faint"> 환경</small>
        </div>
        <div class="mt-2.5 text-[11.5px] font-medium text-muted">DEV · QAS · PRD (전용)</div>
      </div>

      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary-tint-2 text-primary">
            <AlertTriangle class="h-3.5 w-3.5" />
          </span>
          적용 규칙
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight">
          8
        </div>
        <div class="mt-2.5 text-[11.5px] font-medium text-muted">전역 4 · 프로젝트 4</div>
      </div>
    </div>

    <!-- 4. 하단 상세 내역 영역 (Grid 분할) -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- 4-1. 최근 검사 이력 -->
      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">최근 검사</h3>
          <span class="text-xs font-medium text-faint">환경별 실행 이력</span>
          <button class="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">전체 보기</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">환경</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">실행 시각</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">결과</th>
                <th class="border-b border-line px-4.5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-faint">판정</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in checkRuns" :key="run.id" class="transition hover:bg-surface-2">
                <td class="border-b border-line px-4.5 py-3 align-middle">
                  <span class="rounded-full border border-line-2 bg-surface-2 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted">
                    {{ run.tenantName }}
                  </span>
                </td>
                <td class="border-b border-line px-4.5 py-3 align-middle font-mono text-[12px] text-muted">{{ run.startedAt }}</td>
                <td class="border-b border-line px-4.5 py-3 align-middle text-[13px]">
                  <span class="mr-1 rounded-full border border-pass-line bg-pass-bg px-2 py-0.5 font-mono text-[11.5px] font-semibold text-pass">{{ run.summary.pass }}</span>
                  <span class="mr-1 rounded-full border border-warn-line bg-warn-bg px-2 py-0.5 font-mono text-[11.5px] font-semibold text-warn">{{ run.summary.warn }}</span>
                  <span class="rounded-full border border-fail-line bg-fail-bg px-2 py-0.5 font-mono text-[11.5px] font-semibold text-fail">{{ run.summary.fail }}</span>
                </td>
                <td class="border-b border-line px-4.5 py-3 text-right align-middle">
                  <span :class="[
                    'rounded-full border px-2.5 py-0.5 font-mono text-[11.5px] font-semibold',
                    run.verdict === '통과' ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
                  ]">
                    {{ run.verdict }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4-2. 규칙별 위반 상위 -->
      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">규칙별 위반 상위</h3>
          <span class="text-xs font-medium text-faint">최근 30일</span>
        </div>
        <div class="flex flex-col gap-4 p-5">
          <div v-for="finding in topFindings" :key="finding.id">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
              <span class="font-mono text-[12.5px] text-primary-600">{{ finding.ruleKey }}</span>
              <b class="font-mono text-[12.5px]">{{ finding.count }}</b>
            </div>
            <div class="flex h-1.5 overflow-hidden rounded-full bg-line">
              <i :class="[
                  'h-full',
                  finding.severity === 'fail' ? 'bg-fail' : (finding.severity === 'warn' ? 'bg-warn' : 'bg-primary')
                ]" 
                :style="`width: ${finding.count * 10}%`">
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
