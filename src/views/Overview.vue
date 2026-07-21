<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { CheckRun, Finding, Tenant } from '../types';
import { PlayCircle, ShieldAlert, Layers, CheckCircle2, AlertTriangle } from 'lucide-vue-next';

// 1. ?îÎ©¥??Î∞îÏù∏?©Ìï† ?∞Ïù¥???ÅÌÉú Î≥Ä???†Ïñ∏
const tenants = ref<Tenant[]>([]);
const checkRuns = ref<CheckRun[]>([]);
const topFindings = ref<Finding[]>([]);
const isLoading = ref(true);

// 2. Ïª¥Ìè¨?åÌä∏ ÎßàÏö¥?????îÎ? ?∞Ïù¥??Î∂àÎü¨?§Í∏∞
onMounted(async () => {
  isLoading.value = true;
  const projectId = 'p1'; // ?ÑÏãú ?ÑÎ°ú?ùÌä∏ ID
  
  // Î≥ëÎ†¨Î°?API ?∏Ï∂ú ?úÎ??àÏù¥??  const [tData, cData, fData] = await Promise.all([
    apiService.getTenants(projectId),
    apiService.getCheckRuns(projectId),
    apiService.getTopFindings()
  ]);
  
  tenants.value = tData;
  checkRuns.value = cData;
  topFindings.value = fData;
  isLoading.value = false;
});

// ?òÍ≤ΩÎ≥?Î∞∞Ï? ?âÏÉÅ ?®Ïàò
const getEnvBadgeClass = (name: string) => {
  if (name.includes('DEV')) return 'bg-[#EEF0FE] text-dev';
  if (name.includes('QAS')) return 'bg-warn-bg text-qas';
  if (name.includes('PRD')) return 'bg-pass-bg text-prd';
  return 'bg-surface-2 text-muted';
};
</script>

<template>
  <div v-if="isLoading" class="flex h-64 items-center justify-center">
    <!-- Î°úÎî© ?§Ìîº??-->
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="animate-fade">
    <!-- 1. ?òÏù¥ÏßÄ ?§Îçî (?Ä?¥Ì? Î∞??°ÏÖò Î≤ÑÌäº) -->
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">?Ä?úÎ≥¥??/h1>
        <div class="mt-1 text-[13px] text-muted">S-Oil IS ?ÑÌôò ¬∑ ?úÎìú?§Ï??¥ÌîÑ ?ÅÌÉú?Ä ÏµúÍ∑º Í≤Ä??/div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <PlayCircle class="h-[15px] w-[15px]" />
          ??Í≤Ä???§Ìñâ
        </button>
      </div>
    </div>

    <!-- 2. ?úÎìú?§Ï??¥ÌîÑ ?åÏù¥?ÑÎùº???ÅÏó≠ -->
    <div class="mb-5 flex flex-col md:flex-row items-stretch gap-0">
      <template v-for="(tenant, index) in tenants" :key="tenant.id">
        <!-- ?åÎÑå??Î∞ïÏä§ -->
        <div class="relative flex-1 rounded-2xl border border-line bg-surface p-4.5 shadow-md">
          <div class="mb-3 flex items-center gap-2">
            <span :class="['rounded-md px-2 py-1 font-mono text-[11px] font-semibold tracking-wide', getEnvBadgeClass(tenant.name)]">
              {{ tenant.name.split(' ').pop() || tenant.name }}
            </span>
            <span class="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
              <i :class="['h-1.5 w-1.5 rounded-full shadow-[0_0_0_3px]', tenant.status === 'connected' ? 'bg-pass shadow-pass-bg' : 'bg-fail shadow-fail-bg']"></i>
              {{ tenant.status === 'connected' ? '?∞Í≤∞?? : '?§Î•ò' }}
            </span>
          </div>
          <div class="truncate font-disp text-[15px] font-semibold tracking-tight text-ink">
            {{ tenant.name }}
          </div>
          <div class="mb-3.5 truncate font-mono text-[11.5px] text-muted">{{ tenant.odataUrl }}</div>
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[11.5px] font-semibold border-pass-line bg-pass-bg text-pass">
              {{ tenant.status === 'connected' ? '?µÍ≥º' : 'Î≥¥Î•ò' }}
            </span>
            <small class="text-[11px] text-faint">{{ tenant.lastChecked }}</small>
          </div>
        </div>
        <!-- ?∞Í≤∞??(ÎßàÏ?Îß??îÏÜå ?úÏô∏)
        <div v-if="index < tenants.length - 1" class="flex w-8 shrink-0 items-center justify-center text-faint md:w-8 hidden md:flex">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div> -->
      </template>
    </div>

    <!-- 3. Ï£ºÏöî ?µÍ≥Ñ Ïπ¥Îìú (Grid ?ÅÏö©) -->
    <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary-tint-2 text-primary">
            <CheckCircle2 class="h-3.5 w-3.5" />
          </span>
          QAS ?µÍ≥º??        </div>
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
          ?¥Î¶∞ ?ÑÎ∞ò
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
          ?úÎìú?§Ï??¥ÌîÑ
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight">
          3<small class="text-sm font-semibold text-faint"> ?òÍ≤Ω</small>
        </div>
        <div class="mt-2.5 text-[11.5px] font-medium text-muted">DEV ¬∑ QAS ¬∑ PRD (?ÑÏö©)</div>
      </div>

      <div class="rounded-2xl border border-line bg-surface p-4.5 shadow-md">
        <div class="flex items-center gap-2 text-xs font-medium text-muted">
          <span class="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-primary-tint-2 text-primary">
            <AlertTriangle class="h-3.5 w-3.5" />
          </span>
          ?ÅÏö© Í∑úÏπô
        </div>
        <div class="mt-3 font-disp text-[29px] font-bold leading-none tracking-tight">
          8
        </div>
        <div class="mt-2.5 text-[11.5px] font-medium text-muted">?ÑÏó≠ 4 ¬∑ ?ÑÎ°ú?ùÌä∏ 4</div>
      </div>
    </div>

    <!-- 4. ?òÎã® ?ÅÏÑ∏ ?¥Ïó≠ ?ÅÏó≠ (Grid Î∂ÑÌï†) -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <!-- 4-1. ÏµúÍ∑º Í≤Ä???¥Î†• -->
      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">ÏµúÍ∑º Í≤Ä??/h3>
          <span class="text-xs font-medium text-faint">?òÍ≤ΩÎ≥??§Ìñâ ?¥Î†•</span>
          <button class="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">?ÑÏ≤¥ Î≥¥Í∏∞</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">?òÍ≤Ω</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">?§Ìñâ ?úÍ∞Å</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">Í≤∞Í≥º</th>
                <th class="border-b border-line px-4.5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-faint">?êÏ†ï</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="run in checkRuns" :key="run.id" class="transition hover:bg-surface-2">
                <td class="border-b border-line px-4.5 py-3 align-middle">
                  <span class="rounded-full border border-line-2 bg-surface-2 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-muted">
                    {{ run.name }}
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
                    run.verdict === '?µÍ≥º' ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
                  ]">
                    {{ run.verdict }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4-2. Í∑úÏπôÎ≥??ÑÎ∞ò ?ÅÏúÑ -->
      <div class="rounded-2xl border border-line bg-surface shadow-md">
        <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">Í∑úÏπôÎ≥??ÑÎ∞ò ?ÅÏúÑ</h3>
          <span class="text-xs font-medium text-faint">ÏµúÍ∑º 30??/span>
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
                  finding.severity === 'FAIL' ? 'bg-fail' : (finding.severity === 'WARN' ? 'bg-warn' : 'bg-primary')
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
