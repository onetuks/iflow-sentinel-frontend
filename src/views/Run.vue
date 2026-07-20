<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PlayCircle } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { Tenant, CheckRun, IFlow } from '../types';

const router = useRouter();

const isRunning = ref(false);
const progress = ref(0);
const progressLabel = ref('준비 중…');

const tenants = ref<Tenant[]>([]);
const checkRuns = ref<CheckRun[]>([]);
const iflows = ref<IFlow[]>([]);
const steps = ref<any[]>([]);

onMounted(async () => {
  const projectId = 'p1'; // Mock project id for now
  const [mockTenants, mockCheckRuns, mockIflows, mockRunSteps] = await Promise.all([
    apiService.getTenants(projectId),
    apiService.getCheckRuns(projectId),
    apiService.getIFlows(),
    apiService.getRunSteps()
  ]);
  
  tenants.value = mockTenants;
  checkRuns.value = mockCheckRuns;
  iflows.value = mockIflows;
  steps.value = mockRunSteps;
  if (tenants.value.length > 0) {
    activeTab.value = tenants.value.find(t => t.tenantName.includes('QAS'))?.tenantName || tenants.value[0].tenantName;
  }
});

const startRun = () => {
  isRunning.value = true;
  progress.value = 0;
  
  let i = 0;
  const tick = () => {
    if (i >= steps.value.length) {
      setTimeout(() => {
        router.push('/report');
      }, 450);
      return;
    }
    progress.value = steps.value[i].p;
    progressLabel.value = steps.value[i].l;
    i++;
    setTimeout(tick, 520);
  };
  tick();
};

const activeTab = ref('QAS');
</script>

<template>
  <div class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">검사 실행</h1>
        <div class="mt-1 text-[13px] text-muted">테넌트와 iFlow를 선택해 규칙 검사를 실행합니다</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button 
          @click="startRun"
          :disabled="isRunning"
          class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)] disabled:opacity-50 disabled:hover:shadow-[0_4px_14px_rgba(76,93,240,0.32)]"
        >
          <PlayCircle class="h-[15px] w-[15px]" />
          검사 실행
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">대상 선택</h3>
        </div>
        <div class="p-5">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">테넌트</label>
            <div class="flex items-center gap-1.5">
              <button 
                v-for="tenant in tenants" 
                :key="tenant.id"
                @click="activeTab = tenant.tenantName"
                :class="[
                  'flex items-center gap-2 rounded-[10px] px-2.5 py-2 font-mono text-[12.5px] font-semibold transition',
                  activeTab === tenant.tenantName ? 'bg-ink text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-line-2 hover:text-ink'
                ]"
              >
                <div 
                  class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold shadow-sm transition"
                  :class="activeTab === tenant.tenantName ? 'bg-ink text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-line-2 hover:text-ink'"
                >
                  {{ tenant.tenantName.split(' ')[0][0] }}
                </div>
                {{ tenant.tenantName }}
              </button>
            </div>
          </div>
          
          <label class="mb-2.5 mt-1.5 block text-[12.5px] font-semibold text-[#3B4257]">iFlow ({{ iflows.length }})</label>
          <div class="flex flex-col gap-2 rounded-xl border border-line bg-surface-2 p-3">
            <label v-for="iflow in iflows" :key="iflow.id" class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white">
              <input type="checkbox" checked class="h-4 w-4 rounded text-primary focus:ring-primary" />
              <span class="font-mono text-[13px] font-semibold text-ink">{{ iflow.name }}</span>
              <span class="ml-auto font-mono text-[11.5px] text-muted">{{ iflow.protocol }} · {{ iflow.version }}</span>
            </label>
          </div>
          
          <div class="mt-4 text-[12px] text-faint font-mono">
            적용 규칙: <span class="font-semibold text-ink">8개</span> 사용 중 (<router-link to="/rulesets" class="text-primary-600 underline decoration-primary-tint-2 underline-offset-2 hover:decoration-primary-600">적용 규칙 보기</router-link>)
          </div>

          <!-- 프로그레스 영역 -->
          <div v-if="isRunning || progress > 0" class="mt-5 animate-fade rounded-xl bg-primary-tint p-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="font-mono text-[12px] font-semibold text-primary-600">{{ progressLabel }}</span>
              <span class="font-mono text-[12px] font-bold text-primary">{{ progress }}%</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-[#D5DAFB]">
              <div 
                class="h-full bg-gradient-to-r from-[#5666F2] to-[#4C5DF0] transition-all duration-300 ease-out" 
                :style="`width: ${progress}%`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">최근 실행</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">테넌트</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">시각</th>
                <th class="border-b border-line px-4.5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-faint">판정</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in checkRuns" :key="run.id" class="transition hover:bg-surface-2">
                <td class="border-b border-line px-4.5 py-3 align-middle">
                  <span :class="[
                    'rounded-full border border-line-2 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold',
                    run.tenantName.includes('QAS') ? 'bg-warn-bg text-qas' : (run.tenantName.includes('DEV') ? 'bg-[#EEF0FE] text-dev' : 'bg-pass-bg text-prd')
                  ]">
                    {{ run.tenantName }}
                  </span>
                </td>
                <td class="border-b border-line px-4.5 py-3 align-middle font-mono text-[11.5px] text-muted">{{ run.startedAt.includes(' ') ? run.startedAt.split(' ')[1] : run.startedAt }}</td>
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
    </div>
  </div>
</template>
