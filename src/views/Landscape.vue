<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { Tenant } from '../types';
import { Plus, Info, TestTube2 } from 'lucide-vue-next';

const tenants = ref<Tenant[]>([]);
const isLoading = ref(true);
const isTesting = ref(false);
const testResult = ref('');

onMounted(async () => {
  isLoading.value = true;
  tenants.value = await apiService.getTenants('p1');
  isLoading.value = false;
});

const handleTestConnection = () => {
  isTesting.value = true;
  testResult.value = '확인 중…';
  setTimeout(() => {
    testResult.value = 'OAuth2 인증 성공 · 22 패키지 조회됨';
    isTesting.value = false;
  }, 900);
};

const getEnvBadgeClass = (env: string) => {
  if (env === 'DEV') return 'bg-[#EEF0FE] text-dev';
  if (env === 'QAS') return 'bg-warn-bg text-qas';
  if (env === 'PRD') return 'bg-pass-bg text-prd';
  return 'bg-surface-2 text-muted';
};
</script>

<template>
  <div v-if="isLoading" class="flex h-64 items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">랜드스케이프</h1>
        <div class="mt-1 text-[13px] text-muted">이 프로젝트 전용 DEV · QAS · PRD 테넌트</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Plus class="h-[15px] w-[15px]" />
          테넌트 추가
        </button>
      </div>
    </div>

    <!-- 정보 안내 노트 -->
    <div class="mb-5 flex gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
      <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
      <span>테넌트는 <b>이 프로젝트에 종속</b>되며 다른 프로젝트와 공유되지 않습니다. 각 환경(DEV/QAS/PRD)은 별도 OData 엔드포인트와 자격증명을 갖습니다.</span>
    </div>

    <!-- 테넌트 요약 카드 목록 -->
    <div class="mb-5 grid grid-cols-1 gap-4.5 md:grid-cols-3">
      <div v-for="tenant in tenants" :key="tenant.id" class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="mb-3.5 flex items-center gap-2">
          <span :class="['rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide', getEnvBadgeClass(tenant.environment)]">
            {{ tenant.environment }}
          </span>
          <span class="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
            <i :class="['h-2 w-2 rounded-full shadow-[0_0_0_3px]', tenant.status === 'connected' ? 'bg-pass shadow-pass-bg' : 'bg-fail shadow-fail-bg']"></i>
            {{ tenant.status === 'connected' ? '정상' : '오류' }}
          </span>
        </div>
        <div class="truncate font-mono text-[11.5px] text-muted">{{ tenant.odataUrl }}</div>
        <div class="mt-2.5 font-mono text-[11.5px] text-muted">CF · {{ tenant.packageCount }} 패키지</div>
      </div>
    </div>

    <!-- 폼 영역 (QAS 예시) -->
    <div class="rounded-2xl border border-line bg-surface shadow-md">
      <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <h3 class="m-0 font-disp text-[14.5px] font-semibold">테넌트 등록 · 편집</h3>
        <span class="text-xs font-medium text-faint">QAS 환경</span>
      </div>
      <div class="p-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">환경</label>
            <select class="w-full appearance-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;">
              <option>QAS</option>
              <option>DEV</option>
              <option>PRD</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">유형</label>
            <select class="w-full appearance-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;">
              <option>Cloud Foundry</option>
              <option>Edge Integration Cell</option>
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">OData API URL</label>
          <input type="text" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" value="https://soil-qas.integrationsuite.cfapps.eu10.hana.ondemand.com/api/v1" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Client ID</label>
            <input type="text" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" value="sb-soil-qas-a1b2…" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Client Secret</label>
            <input type="password" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" value="••••••••••••" />
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Token URL</label>
          <input type="text" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" value="https://soil.authentication.eu10.hana.ondemand.com/oauth/token" />
          <div class="mt-1.5 text-[11.5px] text-faint">Client Credentials · 자격증명은 암호화 저장됩니다.</div>
        </div>

        <!-- 액션 버튼 및 테스트 결과 슬롯 -->
        <div class="mb-3.5 mt-2 flex min-h-[34px] items-center text-[12px] font-mono text-muted">
          <span v-if="testResult" :class="isTesting ? '' : 'rounded-full border border-pass-line bg-pass-bg px-2.5 py-1 text-[11.5px] font-semibold text-pass'">
            {{ testResult }}
          </span>
        </div>
        
        <div class="flex items-center gap-2.5">
          <button 
            @click="handleTestConnection" 
            :disabled="isTesting"
            class="flex items-center gap-1.5 rounded-[11px] border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:-translate-y-[1px] hover:shadow-md disabled:opacity-50 disabled:hover:translate-y-0"
          >
            <TestTube2 class="h-[15px] w-[15px]" />
            연결 테스트
          </button>
          <div class="flex-1"></div>
          <button class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
            테넌트 저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
