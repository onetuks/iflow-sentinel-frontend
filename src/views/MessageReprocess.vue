<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { RefreshCw, Search, AlertTriangle, CheckCircle2, XCircle, History, PlayCircle } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { Tenant, TrackerArtifact, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry } from '../types';
import ConfirmModal from '../components/ConfirmModal.vue';

// SAP IS는 실패한 메시지를 자동으로 재처리하는 기능이 없다.
// 그래서 사용자가 SAP IS Message Monitoring에서 직접 확인한 Message ID를 이 화면에 입력하면,
// (1) 해당 테넌트의 Data Store 큐에서 그 ID를 가진 엔트리를 찾고
// (2) Body(원본 payload)를 조회하고
// (3) 선택한 아티팩트의 엔드포인트로 직접 호출(재전송)하는 과정을 자동화한다.
const activeTab = ref<'execute' | 'history'>('execute');

// ── 대상 선택 (테넌트 → 패키지 → 아티팩트) ─────────────────────
const tenants = ref<Tenant[]>([]);
const activeTenantId = ref<number | ''>('');
const allArtifacts = ref<TrackerArtifact[]>([]);
const selectedPackage = ref('');
const selectedArtifactId = ref<number | string | ''>('');

const currentTenant = computed(() => tenants.value.find(t => t.id === activeTenantId.value));
const isProdTenant = computed(() => (currentTenant.value?.name || '').includes('PRD'));

const availablePackages = computed(() => {
  const pkgs = new Set(allArtifacts.value.map(a => a.package));
  return Array.from(pkgs);
});

const availableArtifacts = computed(() => {
  return allArtifacts.value.filter(a => a.package === selectedPackage.value);
});

const selectedArtifact = computed(() =>
  allArtifacts.value.find(a => a.id === selectedArtifactId.value)
);

const fetchArtifacts = async () => {
  allArtifacts.value = [];
  selectedPackage.value = '';
  selectedArtifactId.value = '';
  if (!currentTenant.value) return;
  allArtifacts.value = await apiService.getTrackerArtifacts(currentTenant.value.id);
  if (availablePackages.value.length > 0) {
    selectedPackage.value = availablePackages.value[0];
  }
};

watch(activeTenantId, fetchArtifacts);

watch(selectedPackage, () => {
  selectedArtifactId.value = availableArtifacts.value.length > 0 ? availableArtifacts.value[0].id : '';
});

// 아티팩트를 바꾸면 이전 조회 결과는 더 이상 유효하지 않으므로 초기화한다.
watch(selectedArtifactId, () => {
  lookupResult.value = null;
  executionResult.value = null;
});

onMounted(async () => {
  tenants.value = await apiService.getTenants(1);
  if (tenants.value.length > 0) {
    activeTenantId.value = tenants.value[0].id;
  }
  await refreshHistory();
});

// ── Message ID 조회 ─────────────────────────────────────────
const messageId = ref('');
const isLooking = ref(false);
const lookupResult = ref<DataStoreEntryLookupResult | null>(null);

const canLookup = computed(() => !!selectedArtifactId.value && messageId.value.trim().length > 0);

const lookupMessage = async () => {
  if (!canLookup.value || !currentTenant.value || !selectedArtifactId.value) return;
  isLooking.value = true;
  executionResult.value = null;
  try {
    lookupResult.value = await apiService.lookupDataStoreEntry(
      currentTenant.value.id,
      Number(selectedArtifactId.value),
      messageId.value.trim()
    );
  } finally {
    isLooking.value = false;
  }
};

// ── 재처리 실행 ─────────────────────────────────────────────
const isConfirmOpen = ref(false);
const isExecuting = ref(false);
const executionResult = ref<ReprocessExecutionResult | null>(null);

const openConfirm = () => {
  if (!lookupResult.value?.found) return;
  isConfirmOpen.value = true;
};

const executeReprocess = async () => {
  if (!currentTenant.value || !selectedArtifactId.value) return;
  isConfirmOpen.value = false;
  isExecuting.value = true;
  try {
    executionResult.value = await apiService.executeReprocess({
      tenantId: currentTenant.value.id,
      artifactId: Number(selectedArtifactId.value),
      messageId: messageId.value.trim()
    });
    await refreshHistory();
  } finally {
    isExecuting.value = false;
  }
};

// ── 재처리 이력 ─────────────────────────────────────────────
const history = ref<ReprocessHistoryEntry[]>([]);
const historyTenantFilter = ref<number | ''>('');
const historyResultFilter = ref<'' | 'SUCCESS' | 'FAILED'>('');

const refreshHistory = async () => {
  history.value = await apiService.getReprocessHistory(
    historyTenantFilter.value ? Number(historyTenantFilter.value) : undefined
  );
};

const filteredHistory = computed(() => {
  return history.value.filter(h => !historyResultFilter.value || h.result === historyResultFilter.value);
});

const envBadgeClass = (tenantName: string) => {
  if (tenantName.includes('PRD')) return 'bg-pass-bg text-prd';
  if (tenantName.includes('QAS')) return 'bg-warn-bg text-qas';
  return 'bg-[#EEF0FE] text-dev';
};
</script>

<template>
  <div class="animate-fade flex flex-col h-[calc(100vh-2rem)]">
    <!-- Header -->
    <div class="mb-5 flex min-h-[44px] flex-wrap items-center gap-3.5 shrink-0">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">메시지 재처리</h1>
        <div class="mt-1 text-[13px] text-muted">
          Data Store에 남아있는 실패 메시지를 Message ID로 찾아 재전송합니다
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 border-b border-line shrink-0">
      <button
        @click="activeTab = 'execute'"
        :class="[
          'flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition',
          activeTab === 'execute' ? 'border-primary text-primary-600' : 'border-transparent text-muted hover:text-ink'
        ]"
      >
        <PlayCircle class="h-[15px] w-[15px]" />
        재처리 실행
      </button>
      <button
        @click="activeTab = 'history'"
        :class="[
          'flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold transition',
          activeTab === 'history' ? 'border-primary text-primary-600' : 'border-transparent text-muted hover:text-ink'
        ]"
      >
        <History class="h-[15px] w-[15px]" />
        재처리 이력
      </button>
    </div>

    <!-- ───────────── 탭 1: 재처리 실행 ───────────── -->
    <div v-if="activeTab === 'execute'" class="flex-1 overflow-auto">
      <!-- 테넌트 선택 -->
      <div class="mb-4">
        <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">테넌트</label>
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="tenant in tenants"
            :key="tenant.id"
            @click="activeTenantId = tenant.id"
            :class="[
              'flex items-center gap-2 rounded-[10px] border px-3 py-2 font-mono text-[13px] font-semibold transition',
              activeTenantId === tenant.id ? 'border-ink bg-ink text-white shadow-sm' : 'border-line bg-white text-muted hover:bg-surface-2 hover:text-ink'
            ]"
          >
            {{ tenant.name }}
            <span :class="['rounded-full px-1.5 py-0 text-[10.5px] font-bold', envBadgeClass(tenant.name)]">
              {{ tenant.name.includes('PRD') ? 'PRD' : tenant.name.includes('QAS') ? 'QAS' : 'DEV' }}
            </span>
          </button>
        </div>
      </div>

      <!-- PRD 경고 배너 -->
      <div v-if="isProdTenant" class="mb-4 flex gap-3 rounded-xl border border-fail-line bg-fail-bg px-4 py-3.5 text-[12.5px] text-fail">
        <AlertTriangle class="h-[18px] w-[18px] shrink-0" />
        <div>
          <b>운영(PRD) 환경입니다.</b> 재처리를 실행하면 실제 메시지가 다시 전송됩니다. 대상과 Message ID를 다시 한번 확인하세요.
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <!-- 좌측: 대상/조회 -->
        <div class="rounded-2xl border border-line bg-surface shadow-md">
          <div class="border-b border-line px-5 py-4">
            <h3 class="m-0 font-disp text-[14.5px] font-semibold">대상 아티팩트 &amp; Message ID</h3>
          </div>
          <div class="p-5">
            <div class="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">패키지</label>
                <select
                  v-model="selectedPackage"
                  class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option v-for="pkg in availablePackages" :key="pkg" :value="pkg">{{ pkg }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">아티팩트</label>
                <select
                  v-model="selectedArtifactId"
                  class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option v-for="a in availableArtifacts" :key="a.id" :value="a.id">{{ a.artifact }}</option>
                </select>
              </div>
            </div>

            <!-- 자동 매핑된 엔드포인트 -->
            <div v-if="selectedArtifact" class="mb-4 rounded-xl border border-line-2 bg-surface-2 px-3.5 py-3 text-[12px]">
              <div class="mb-1 font-semibold text-muted">호출 대상 엔드포인트 (아티팩트 선택 시 자동 매핑)</div>
              <div class="font-mono text-[12.5px] text-ink break-all">
                {{ selectedArtifact.endpointUrl || '엔드포인트 정보가 아직 없습니다 (백엔드 연동 대기 중)' }}
              </div>
            </div>

            <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">Message ID</label>
            <div class="flex gap-2">
              <input
                v-model="messageId"
                type="text"
                placeholder="예: AGRlNDA4YTY3ZTQ0MjNhZjY4YT..."
                class="w-full rounded-[10px] border border-line bg-white px-3 py-2 font-mono text-[12.5px] text-ink placeholder-faint outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                @keyup.enter="lookupMessage"
              />
              <button
                @click="lookupMessage"
                :disabled="!canLookup || isLooking"
                class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-sm transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search class="h-[14px] w-[14px]" />
                조회
              </button>
            </div>

            <!-- 조회 결과 -->
            <div v-if="isLooking" class="mt-4 text-[12.5px] text-muted">Data Store 조회 중…</div>

            <div v-else-if="lookupResult" class="mt-4">
              <div v-if="lookupResult.found" class="rounded-xl border border-pass-line bg-pass-bg px-3.5 py-3">
                <div class="mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-pass">
                  <CheckCircle2 class="h-[15px] w-[15px]" />
                  엔트리를 찾았습니다
                </div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-ink">
                  <div><span class="text-muted">Data Store</span> {{ lookupResult.dataStoreName }}</div>
                  <div><span class="text-muted">Entry ID</span> {{ lookupResult.entryId }}</div>
                  <div><span class="text-muted">저장 시각</span> {{ lookupResult.storedAt }}</div>
                  <div><span class="text-muted">크기</span> {{ lookupResult.sizeBytes }} bytes</div>
                </div>
              </div>
              <div v-else class="flex gap-2 rounded-xl border border-warn-line bg-warn-bg px-3.5 py-3 text-[12.5px] text-warn-line">
                <XCircle class="h-[15px] w-[15px] shrink-0" />
                <span>{{ lookupResult.notFoundReason || '해당 Message ID를 Data Store에서 찾을 수 없습니다. ID를 다시 확인하세요.' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 우측: Body 미리보기 & 실행 -->
        <div class="rounded-2xl border border-line bg-surface shadow-md">
          <div class="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 class="m-0 font-disp text-[14.5px] font-semibold">Body 미리보기</h3>
          </div>
          <div class="p-5">
            <pre
              v-if="lookupResult?.found"
              class="max-h-[320px] overflow-auto rounded-xl bg-[#1A1E2E] p-4 font-mono text-[12px] leading-relaxed text-[#D5D9EE] whitespace-pre-wrap break-all"
            >{{ lookupResult.body || '(본문이 비어있습니다)' }}</pre>
            <div v-else class="flex h-[200px] items-center justify-center text-[12.5px] text-faint">
              Message ID를 조회하면 본문이 여기 표시됩니다
            </div>

            <button
              @click="openConfirm"
              :disabled="!lookupResult?.found || isExecuting"
              class="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-[0_4px_14px_rgba(76,93,240,0.32)]"
            >
              <RefreshCw class="h-[15px] w-[15px]" :class="{ 'animate-spin': isExecuting }" />
              {{ isExecuting ? '재처리 실행 중…' : '재처리 실행' }}
            </button>

            <div
              v-if="executionResult"
              :class="[
                'mt-3 rounded-xl border px-3.5 py-3 text-[12.5px]',
                executionResult.success ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
              ]"
            >
              <b>{{ executionResult.success ? '재처리 성공' : '재처리 실패' }}</b>
              <span v-if="executionResult.responseCode"> · 응답 코드 {{ executionResult.responseCode }}</span>
              <div v-if="executionResult.message" class="mt-1 text-[12px]">{{ executionResult.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────────── 탭 2: 재처리 이력 ───────────── -->
    <div v-else class="flex flex-1 flex-col overflow-hidden">
      <div class="mb-4 flex flex-wrap gap-3 shrink-0">
        <select
          v-model="historyTenantFilter"
          @change="refreshHistory"
          class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">모든 테넌트</option>
          <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
        <select
          v-model="historyResultFilter"
          class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">모든 결과</option>
          <option value="SUCCESS">성공</option>
          <option value="FAILED">실패</option>
        </select>
      </div>

      <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-md min-h-0">
        <div class="flex-1 overflow-auto bg-white">
          <table class="w-full min-w-[820px] border-collapse">
            <thead class="sticky top-0 z-10 bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <tr>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">실행 일시</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">테넌트</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">아티팩트</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">Message ID</th>
                <th class="border-b border-line px-4.5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">실행자</th>
                <th class="border-b border-line px-4.5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-faint">결과</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredHistory.length === 0">
                <td colspan="6" class="py-16 text-center text-[13px] text-muted">
                  재처리 이력이 없습니다. (백엔드 연동 대기 중)
                </td>
              </tr>
              <tr v-for="h in filteredHistory" :key="h.id" class="border-b border-line/50 transition last:border-b-0 hover:bg-surface-2">
                <td class="px-4.5 py-3 align-middle font-mono text-[12px] text-muted">{{ h.executedAt }}</td>
                <td class="px-4.5 py-3 align-middle">
                  <span :class="['rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold', envBadgeClass(h.tenantName)]">{{ h.tenantName }}</span>
                </td>
                <td class="px-4.5 py-3 align-middle text-[12.5px] text-ink">{{ h.artifactName }}</td>
                <td class="px-4.5 py-3 align-middle font-mono text-[12px] text-muted break-all">{{ h.messageId }}</td>
                <td class="px-4.5 py-3 align-middle text-[12.5px] text-muted">{{ h.executedBy }}</td>
                <td class="px-4.5 py-3 text-right align-middle">
                  <span
                    :class="[
                      'rounded-full border px-2.5 py-0.5 font-mono text-[11.5px] font-semibold',
                      h.result === 'SUCCESS' ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
                    ]"
                  >
                    {{ h.result === 'SUCCESS' ? '성공' : '실패' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 실행 확인 모달 -->
    <ConfirmModal
      v-model="isConfirmOpen"
      title="메시지 재처리 실행"
      :variant="isProdTenant ? 'danger' : 'default'"
      confirm-label="재처리 실행"
      :require-typed-text="isProdTenant ? currentTenant?.name : undefined"
      @confirm="executeReprocess"
    >
      <p class="mb-3">아래 대상으로 메시지를 다시 전송합니다. 계속하시겠습니까?</p>
      <div class="space-y-1 rounded-xl border border-line-2 bg-surface-2 px-3.5 py-3 text-[12.5px]">
        <div><span class="text-muted">테넌트</span> · {{ currentTenant?.name }}</div>
        <div><span class="text-muted">아티팩트</span> · {{ selectedArtifact?.artifact }}</div>
        <div><span class="text-muted">Message ID</span> · <span class="font-mono">{{ messageId }}</span></div>
      </div>
    </ConfirmModal>
  </div>
</template>
