<script setup lang="ts">
import { ref, computed, onMounted, inject, watch } from 'vue';
import {
  RefreshCw, Search, AlertTriangle, CheckCircle2, XCircle, History, PlayCircle,
  Database, Layers, ExternalLink, AlertCircle, Clock, FileText, Check
} from 'lucide-vue-next';
import { apiService } from '../services/api';
import type {
  Tenant, TrackerArtifact, DataStoreEntryLookupResult, ReprocessExecutionResult,
  ReprocessHistoryEntry, MplFailureLog, ReprocessSupportType
} from '../types';
import ConfirmModal from '../components/ConfirmModal.vue';
import StorageMappingModal from '../components/StorageMappingModal.vue';

const activeTab = ref<'execute' | 'history'>('execute');

// ── 프로젝트 & 테넌트 Context ──────────────────────────────────
const currentProjectName = inject<any>('currentProject');
const projectsList = inject<any>('projects');

const currentProjectId = computed(() => {
  if (!currentProjectName || !projectsList || !projectsList.value) return undefined;
  const p = projectsList.value.find((p: any) => p.name === currentProjectName.value);
  return p ? p.id : undefined;
});

// ── 대상 선택 (테넌트 → 패키지 → 아티팩트) ─────────────────────
const tenants = ref<Tenant[]>([]);
const activeTenantId = ref<number | ''>('');
const allArtifacts = ref<TrackerArtifact[]>([]);
const selectedPackage = ref('');
const selectedArtifactId = ref<number | string | ''>('');
const isLoadingArtifacts = ref(false);

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

// ── 아티팩트 재처리 지원 유형 및 저장소 정보 ───────────────────
const currentReprocessType = computed<ReprocessSupportType>(() => {
  return selectedArtifact.value?.reprocessType || 'DATASTORE_ONLY';
});

const targetStorageType = ref<'DATASTORE' | 'JMS'>('DATASTORE');

// 아티팩트 변경 시 저장소 타겟 자동 설정
watch(selectedArtifact, (newArt) => {
  if (newArt) {
    if (newArt.reprocessType === 'JMS_ONLY') {
      targetStorageType.value = 'JMS';
    } else {
      targetStorageType.value = 'DATASTORE';
    }
    fetchMplFailures();
  }
});

const fetchArtifacts = async () => {
  allArtifacts.value = [];
  selectedPackage.value = '';
  selectedArtifactId.value = '';
  if (!currentTenant.value) return;
  isLoadingArtifacts.value = true;
  try {
    allArtifacts.value = await apiService.getTrackerArtifacts(currentTenant.value.id);
    if (availablePackages.value.length > 0) {
      selectedPackage.value = availablePackages.value[0];
    }
  } finally {
    isLoadingArtifacts.value = false;
  }
};

const loadTenantsAndArtifacts = async () => {
  try {
    const data = await apiService.getTenants(currentProjectId.value);
    tenants.value = data;
    if (tenants.value.length > 0) {
      if (!activeTenantId.value || !tenants.value.some(t => t.id === activeTenantId.value)) {
        activeTenantId.value = tenants.value[0].id;
      }
      await fetchArtifacts();
    } else {
      activeTenantId.value = '';
      allArtifacts.value = [];
    }
  } catch (e) {
    console.error('Failed to load tenants:', e);
    tenants.value = [];
    allArtifacts.value = [];
  }
};

watch(currentProjectId, async () => {
  await loadTenantsAndArtifacts();
});

watch(activeTenantId, fetchArtifacts);

watch(selectedPackage, () => {
  selectedArtifactId.value = availableArtifacts.value.length > 0 ? availableArtifacts.value[0].id : '';
});

// 아티팩트를 바꾸면 이전 조회 및 확정 결과 초기화
watch(selectedArtifactId, () => {
  lookupResult.value = null;
  executionResult.value = null;
  selectedMplLog.value = null;
  messageId.value = '';
});

onMounted(async () => {
  await loadTenantsAndArtifacts();
  await refreshHistory();
});

// ── 최근 MPL 실패 목록 자동 조회 & 메시지 선택 ───────────────
const selectionMode = ref<'mpl_list' | 'manual_id'>('mpl_list');
const mplLogs = ref<MplFailureLog[]>([]);
const isLoadingMpl = ref(false);
const selectedMplLog = ref<MplFailureLog | null>(null);

const fetchMplFailures = async () => {
  if (!currentTenant.value || !selectedArtifactId.value) return;
  isLoadingMpl.value = true;
  try {
    mplLogs.value = await apiService.getMplFailureLogs(currentTenant.value.id, selectedArtifactId.value);
    if (mplLogs.value.length > 0) {
      selectMplLog(mplLogs.value[0]);
    }
  } finally {
    isLoadingMpl.value = false;
  }
};

const selectMplLog = (log: MplFailureLog) => {
  selectedMplLog.value = log;
  messageId.value = log.messageId;
  lookupResult.value = null;
  executionResult.value = null;
  // 건 선택 시 자동 조회 수행
  lookupMessage();
};

// ── Message ID & 저장소 조회 ──────────────────────────────────
const messageId = ref('');
const isLooking = ref(false);
const lookupResult = ref<DataStoreEntryLookupResult | null>(null);

const canLookup = computed(() => !!selectedArtifactId.value && messageId.value.trim().length > 0 && currentReprocessType.value !== 'NONE');

const lookupMessage = async () => {
  if (!canLookup.value || !currentTenant.value || !selectedArtifactId.value) return;
  isLooking.value = true;
  executionResult.value = null;
  try {
    lookupResult.value = await apiService.lookupDataStoreEntry(
      currentTenant.value.id,
      selectedArtifactId.value,
      messageId.value.trim(),
      targetStorageType.value
    );
  } finally {
    isLooking.value = false;
  }
};

// 저장소 구분을 변경했을 때(BOTH인 경우 DATASTORE <-> JMS) 재조회
watch(targetStorageType, () => {
  if (messageId.value.trim()) {
    lookupMessage();
  }
});

// ── 3단계 저장소 매핑 모달 ────────────────────────────────────
const isMappingModalOpen = ref(false);
const activeMappingStorageType = ref<'DATASTORE' | 'JMS'>('DATASTORE');

const openMappingModal = (type: 'DATASTORE' | 'JMS') => {
  activeMappingStorageType.value = type;
  isMappingModalOpen.value = true;
};

const handleMappingSaved = (updatedName: string) => {
  if (activeMappingStorageType.value === 'DATASTORE' && selectedArtifact.value) {
    selectedArtifact.value.dataStoreName = updatedName;
  } else if (activeMappingStorageType.value === 'JMS' && selectedArtifact.value) {
    selectedArtifact.value.queueName = updatedName;
  }
  lookupMessage();
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
    const effectiveStorageName = targetStorageType.value === 'DATASTORE'
      ? selectedArtifact.value?.dataStoreName
      : selectedArtifact.value?.queueName;

    executionResult.value = await apiService.executeReprocess({
      tenantId: currentTenant.value.id,
      artifactId: selectedArtifactId.value,
      messageId: messageId.value.trim(),
      storageType: targetStorageType.value,
      storageName: effectiveStorageName,
      tenantName: currentTenant.value.name,
      artifactName: selectedArtifact.value?.artifact
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
const historyStorageFilter = ref<'' | 'DATASTORE' | 'JMS'>('');

const refreshHistory = async () => {
  history.value = await apiService.getReprocessHistory(
    historyTenantFilter.value ? Number(historyTenantFilter.value) : undefined
  );
};

const filteredHistory = computed(() => {
  return history.value.filter(h => {
    const matchResult = !historyResultFilter.value || h.result === historyResultFilter.value;
    const matchStorage = !historyStorageFilter.value || h.storageType === historyStorageFilter.value;
    return matchResult && matchStorage;
  });
});

const envBadgeClass = (tenantName: string) => {
  if (tenantName.includes('PRD')) return 'bg-pass-bg text-prd';
  if (tenantName.includes('QAS')) return 'bg-warn-bg text-qas';
  return 'bg-[#EEF0FE] text-dev';
};

// SAP IS Web UI Manage Queues 딥링크 이동
const openSapIsManageQueues = () => {
  if (!currentTenant.value) return;
  const baseUrl = currentTenant.value.odataUrl.replace('/api/v1', '');
  window.open(`${baseUrl}/shell/monitoring/JmsQueues`, '_blank');
};
</script>

<template>
  <div class="animate-fade flex flex-col h-[calc(100vh-2rem)]">
    <!-- Header -->
    <div class="mb-5 flex min-h-[44px] flex-wrap items-center justify-between gap-3.5 shrink-0">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">메시지 재처리</h1>
          <span class="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-primary">
            Data Store &amp; JMS Queue
          </span>
        </div>
        <div class="mt-1 text-[13px] text-muted">
          실패한 메시지를 탐지하여 원본 Body를 조회하고 엔드포인트로 안전하게 재전송합니다
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
    <div v-if="activeTab === 'execute'" class="flex-1 overflow-auto space-y-4">
      <!-- 테넌트 선택 -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div class="flex items-center gap-3">
          <span class="text-[12.5px] font-bold text-ink">테넌트:</span>
          <div v-if="tenants.length > 0" class="flex flex-wrap items-center gap-2">
            <button
              v-for="tenant in tenants"
              :key="tenant.id"
              @click="activeTenantId = tenant.id"
              :class="[
                'flex items-center gap-2 rounded-[10px] border px-3 py-1.5 font-mono text-[12.5px] font-semibold transition',
                activeTenantId === tenant.id ? 'border-ink bg-ink text-white shadow-sm' : 'border-line bg-white text-muted hover:bg-surface-2 hover:text-ink'
              ]"
            >
              {{ tenant.name }}
              <span :class="['rounded-full px-1.5 py-0 text-[10px] font-bold', envBadgeClass(tenant.name)]">
                {{ tenant.name.includes('PRD') ? 'PRD' : tenant.name.includes('QAS') ? 'QAS' : 'DEV' }}
              </span>
            </button>
          </div>
          <span v-else class="text-[12.5px] text-warn font-medium flex items-center gap-1">
            <AlertCircle class="h-3.5 w-3.5" /> 현재 선택된 프로젝트에 연결된 테넌트가 없습니다.
          </span>
        </div>

        <div v-if="isProdTenant" class="flex items-center gap-2 rounded-xl border border-fail-line bg-fail-bg px-3 py-1.5 text-[12px] font-semibold text-fail">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          운영(PRD) 테넌트 주의
        </div>
      </div>

      <!-- 아티팩트 선택 & 지원 유형 배지 Card -->
      <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="text-[12.5px] font-semibold text-ink">패키지</label>
              <span v-if="isLoadingArtifacts" class="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <RefreshCw class="h-3 w-3 animate-spin" /> 조회 중...
              </span>
            </div>
            <select
              v-model="selectedPackage"
              :disabled="isLoadingArtifacts || availablePackages.length === 0"
              class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-primary disabled:bg-surface-2 disabled:text-muted"
            >
              <option v-if="isLoadingArtifacts" value="">패키지 목록 조회 중...</option>
              <option v-else-if="availablePackages.length === 0" value="">등록된 패키지 없음</option>
              <option v-for="pkg in availablePackages" :key="pkg" :value="pkg">{{ pkg }}</option>
            </select>
          </div>
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="text-[12.5px] font-semibold text-ink">아티팩트</label>
              <span v-if="isLoadingArtifacts" class="flex items-center gap-1 text-[11px] font-semibold text-primary">
                <RefreshCw class="h-3 w-3 animate-spin" /> 조회 중...
              </span>
            </div>
            <select
              v-model="selectedArtifactId"
              :disabled="isLoadingArtifacts || availableArtifacts.length === 0"
              class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none transition focus:border-primary disabled:bg-surface-2 disabled:text-muted"
            >
              <option v-if="isLoadingArtifacts" value="">아티팩트 목록 조회 중...</option>
              <option v-else-if="availableArtifacts.length === 0" value="">등록된 아티팩트 없음</option>
              <option v-for="a in availableArtifacts" :key="a.id" :value="a.id">{{ a.artifact }}</option>
            </select>
          </div>

          <!-- 재처리 지원 유형 배지 & 저장소 정보 -->
          <div v-if="isLoadingArtifacts" class="flex flex-col justify-center items-center rounded-xl border border-line-2 bg-surface-2 p-3 text-[12px] text-muted space-y-1">
            <RefreshCw class="h-4 w-4 animate-spin text-primary" />
            <span>아티팩트 정보 로딩 중...</span>
          </div>
          <div v-else-if="selectedArtifact" class="flex flex-col justify-between rounded-xl border border-line-2 bg-surface-2 p-3">
            <div class="flex items-center justify-between">
              <span class="text-[11.5px] font-semibold text-muted">재처리 지원 유형</span>
              <!-- 배지 -->
              <span
                v-if="currentReprocessType === 'DATASTORE_ONLY'"
                class="inline-flex items-center gap-1 rounded-full border border-pass-line bg-pass-bg px-2.5 py-0.5 font-mono text-[11px] font-bold text-pass"
              >
                <Database class="h-3 w-3" /> Data Store 전용
              </span>
              <span
                v-else-if="currentReprocessType === 'JMS_ONLY'"
                class="inline-flex items-center gap-1 rounded-full border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#7C3AED]"
              >
                <Layers class="h-3 w-3" /> JMS Queue 전용
              </span>
              <span
                v-else-if="currentReprocessType === 'BOTH'"
                class="inline-flex items-center gap-1 rounded-full border border-[#B9E6FE] bg-[#E0F2FE] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0284C7]"
              >
                <Database class="h-3 w-3" /> Data Store &amp; JMS 동시 지원
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 px-2.5 py-0.5 font-mono text-[11px] font-bold text-muted"
              >
                재처리 미지원
              </span>
            </div>

            <!-- 매핑된 저장소 이름 및 변경 버튼 -->
            <div class="mt-2 text-[12px] space-y-1">
              <div v-if="currentReprocessType === 'DATASTORE_ONLY' || currentReprocessType === 'BOTH'" class="flex items-center justify-between">
                <span class="text-muted font-mono">Store: {{ selectedArtifact.dataStoreName || 'DS_AUTO' }}</span>
                <button @click="openMappingModal('DATASTORE')" class="text-[11px] text-primary underline font-medium hover:text-primary-600">
                  매핑 변경
                </button>
              </div>
              <div v-if="currentReprocessType === 'JMS_ONLY' || currentReprocessType === 'BOTH'" class="flex items-center justify-between">
                <span class="text-muted font-mono">Queue: {{ selectedArtifact.queueName || 'Q_AUTO' }}</span>
                <button @click="openMappingModal('JMS')" class="text-[11px] text-[#7C3AED] underline font-medium hover:text-[#6D28D9]">
                  매핑 변경
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 미지원 안내 -->
        <div v-if="currentReprocessType === 'NONE'" class="flex items-center gap-2 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-[12.5px] text-warn">
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>선택한 아티팩트는 Data Store 또는 JMS Queue 스텝이 없어 <b>자동 조회가 불가능</b>합니다. MPL 상세 로그에서 원본 Body를 직접 확인해 주세요.</span>
        </div>

        <!-- BOTH 타입일 때 저장소 선택 탭 -->
        <div v-if="currentReprocessType === 'BOTH'" class="flex items-center justify-between border-t border-line/60 pt-3">
          <span class="text-[12.5px] font-semibold text-ink">조회 저장소 선택:</span>
          <div class="flex gap-2">
            <button
              @click="targetStorageType = 'DATASTORE'"
              :class="[
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[12px] font-semibold transition',
                targetStorageType === 'DATASTORE' ? 'border-primary bg-primary-tint text-primary-600' : 'border-line bg-white text-muted hover:text-ink'
              ]"
            >
              <Database class="h-3.5 w-3.5" /> Data Store
            </button>
            <button
              @click="targetStorageType = 'JMS'"
              :class="[
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-[12px] font-semibold transition',
                targetStorageType === 'JMS' ? 'border-[#8B5CF6] bg-[#F5F3FF] text-[#7C3AED]' : 'border-line bg-white text-muted hover:text-ink'
              ]"
            >
              <Layers class="h-3.5 w-3.5" /> JMS Queue
            </button>
          </div>
        </div>
      </div>

      <!-- 메시지 선택 (최근 MPL 실패 목록 / 수동 ID 입력) -->
      <div v-if="currentReprocessType !== 'NONE'" class="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b border-line px-5 py-3 bg-surface-2">
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4 text-primary" />
            <h3 class="m-0 text-[14px] font-bold text-ink">재처리 대상 메시지 선택</h3>
          </div>

          <div class="flex gap-1 rounded-lg bg-white border border-line p-0.5 text-[12px] font-medium">
            <button
              @click="selectionMode = 'mpl_list'"
              :class="[
                'rounded-md px-3 py-1 transition',
                selectionMode === 'mpl_list' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-ink'
              ]"
            >
              최근 MPL 실패 목록에서 선택
            </button>
            <button
              @click="selectionMode = 'manual_id'"
              :class="[
                'rounded-md px-3 py-1 transition',
                selectionMode === 'manual_id' ? 'bg-primary text-white font-semibold' : 'text-muted hover:text-ink'
              ]"
            >
              Message ID 직접 입력
            </button>
          </div>
        </div>

        <div class="p-5">
          <!-- 모드 1: 최근 MPL 실패 목록 테이블 -->
          <div v-if="selectionMode === 'mpl_list'" class="space-y-3">
            <div class="flex items-center justify-between text-[12.5px]">
              <span class="text-muted">SAP IS OData API로 가져온 최근 실패 로그 (행을 클릭하여 지정)</span>
              <button @click="fetchMplFailures" class="flex items-center gap-1 text-primary text-[12px] font-semibold hover:underline">
                <RefreshCw class="h-3 w-3" :class="{ 'animate-spin': isLoadingMpl }" /> 새로고침
              </button>
            </div>

            <div class="overflow-auto max-h-[220px] rounded-xl border border-line bg-white">
              <table class="w-full text-left text-[12px] border-collapse">
                <thead class="sticky top-0 bg-surface-2 text-faint font-semibold border-b border-line">
                  <tr>
                    <th class="p-2.5">상태</th>
                    <th class="p-2.5">발생 시각</th>
                    <th class="p-2.5">Message ID</th>
                    <th class="p-2.5">Correlation ID</th>
                    <th class="p-2.5">에러 요약</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="isLoadingMpl">
                    <td colspan="5" class="py-8 text-center text-muted">MPL 실패 로그 조회 중…</td>
                  </tr>
                  <tr v-else-if="mplLogs.length === 0">
                    <td colspan="5" class="py-8 text-center text-muted">최근 실패한 메시지가 없습니다.</td>
                  </tr>
                  <tr
                    v-for="log in mplLogs"
                    :key="log.messageId"
                    @click="selectMplLog(log)"
                    :class="[
                      'border-b border-line/60 cursor-pointer transition hover:bg-primary-tint/50',
                      selectedMplLog?.messageId === log.messageId ? 'bg-primary-tint font-medium text-ink' : ''
                    ]"
                  >
                    <td class="p-2.5">
                      <span class="rounded-full bg-fail-bg border border-fail-line px-2 py-0.5 text-[10.5px] font-bold text-fail">
                        {{ log.status }}
                      </span>
                    </td>
                    <td class="p-2.5 font-mono text-muted whitespace-nowrap">{{ log.logStart }}</td>
                    <td class="p-2.5 font-mono text-ink break-all max-w-[180px]">{{ log.messageId }}</td>
                    <td class="p-2.5 font-mono text-muted break-all">{{ log.correlationId }}</td>
                    <td class="p-2.5 text-muted truncate max-w-[200px]">{{ log.errorDetail }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 모드 2: 수동 Message ID 입력 -->
          <div v-else class="space-y-3">
            <label class="block text-[12.5px] font-semibold text-ink">Message ID 수동 입력</label>
            <div class="flex gap-2">
              <input
                v-model="messageId"
                type="text"
                placeholder="예: AGRlNDA4YTY3ZTQ0MjNhZjY4YT..."
                class="w-full rounded-[10px] border border-line bg-white px-3.5 py-2 font-mono text-[12.5px] text-ink outline-none focus:border-primary"
                @keyup.enter="lookupMessage"
              />
              <button
                @click="lookupMessage"
                :disabled="!canLookup || isLooking"
                class="flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
              >
                <Search class="h-4 w-4" /> 조회
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 선택된 메시지 확정 메타 카드 & Body 미리보기 및 실행 영역 -->
      <div v-if="selectedMplLog || lookupResult" class="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        <!-- 좌측: 메시지 메타 정보 & 보존기간 안내 -->
        <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-line pb-3">
            <h3 class="m-0 text-[14.5px] font-bold text-ink flex items-center gap-1.5">
              <Check class="h-4 w-4 text-pass" /> 확정된 메시지 정보
            </h3>
            <span class="text-[11.5px] font-mono text-muted">ID: {{ messageId }}</span>
          </div>

          <div class="space-y-2 text-[12.5px]">
            <div class="flex justify-between py-1 border-b border-line/40">
              <span class="text-muted">Target Storage:</span>
              <span class="font-mono font-bold text-ink">
                {{ targetStorageType === 'DATASTORE' ? selectedArtifact?.dataStoreName : selectedArtifact?.queueName }}
              </span>
            </div>
            <div v-if="selectedMplLog?.correlationId" class="flex justify-between py-1 border-b border-line/40">
              <span class="text-muted">Correlation ID:</span>
              <span class="font-mono text-ink">{{ selectedMplLog.correlationId }}</span>
            </div>
            <div v-if="selectedMplLog?.customHeader" class="flex justify-between py-1 border-b border-line/40">
              <span class="text-muted">SAP Header:</span>
              <span class="font-mono text-[11.5px] text-ink truncate max-w-[240px]">{{ selectedMplLog.customHeader }}</span>
            </div>
            <div v-if="lookupResult?.storedAt" class="flex justify-between py-1 border-b border-line/40">
              <span class="text-muted">저장 시각:</span>
              <span class="font-mono text-ink">{{ lookupResult.storedAt }}</span>
            </div>
          </div>

          <!-- 보존 기간(Expire Days) 계산 및 경고 -->
          <div v-if="lookupResult?.expireDays" class="rounded-xl border border-info-line bg-info-bg/40 p-3.5 space-y-1 text-[12px]">
            <div class="flex items-center justify-between font-semibold text-info">
              <span class="flex items-center gap-1"><Clock class="h-3.5 w-3.5" /> 저장소 보존 기간 설정</span>
              <span>{{ lookupResult.expireDays }} 일</span>
            </div>
            <div class="text-muted">
              MPL 시각 기준 <b>약 {{ lookupResult.daysRemaining || lookupResult.expireDays }}일</b> 남았습니다.
              <span v-if="lookupResult.isExpired" class="text-fail font-bold ml-1">⚠️ 만료로 인해 삭제되었을 수 있습니다!</span>
            </div>
          </div>

          <!-- JMS 큐 특화 딥링크 안내 -->
          <div v-if="targetStorageType === 'JMS'" class="rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] p-3.5 space-y-2 text-[12px]">
            <div class="flex items-center justify-between font-semibold text-[#7C3AED]">
              <span>JMS Queue 개별 메시지 직접 확인</span>
              <button @click="openSapIsManageQueues" class="flex items-center gap-1 text-[11.5px] hover:underline">
                Manage Queues 이동 <ExternalLink class="h-3 w-3" />
              </button>
            </div>
            <div class="text-muted text-[11.5px]">
              SAP IS의 JMS 큐 API 제한에 대비하여, Manage Queues 화면에서 <code class="font-mono bg-white px-1 py-0.5 rounded border border-line">{{ selectedArtifact?.queueName }}</code> 큐를 직접 확인하실 수 있습니다.
            </div>
          </div>
        </div>

        <!-- 우측: Payload Body 미리보기 및 실행 -->
        <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 class="m-0 text-[14.5px] font-bold text-ink">Body 미리보기</h3>
              <span v-if="lookupResult?.sizeBytes" class="font-mono text-[11.5px] text-muted">
                {{ lookupResult.sizeBytes }} bytes
              </span>
            </div>

            <div v-if="isLooking" class="py-16 text-center text-muted text-[12.5px]">
              저장소에서 메시지 Body 조회 중…
            </div>
            <pre
              v-else-if="lookupResult?.found"
              class="max-h-[260px] overflow-auto rounded-xl bg-[#1A1E2E] p-4 font-mono text-[12px] leading-relaxed text-[#D5D9EE] whitespace-pre-wrap break-all border border-line"
            >{{ lookupResult.body || '(본문이 비어있습니다)' }}</pre>
            <div v-else class="flex h-[180px] items-center justify-center text-[12.5px] text-faint border border-dashed border-line rounded-xl">
              {{ lookupResult?.notFoundReason || 'Message ID를 조회하면 원본 본문이 표시됩니다' }}
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <button
              @click="openConfirm"
              :disabled="!lookupResult?.found || isExecuting"
              class="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-3 text-[13.5px] font-bold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isExecuting }" />
              {{ isExecuting ? '재처리 실행 중…' : '재처리 실행 (엔드포인트 호출)' }}
            </button>

            <div
              v-if="executionResult"
              :class="[
                'rounded-xl border px-4 py-3 text-[12.5px]',
                executionResult.success ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
              ]"
            >
              <div class="font-bold flex items-center gap-1.5">
                <CheckCircle2 v-if="executionResult.success" class="h-4 w-4" />
                <XCircle v-else class="h-4 w-4" />
                {{ executionResult.success ? '재처리 성공' : '재처리 실패' }}
                <span v-if="executionResult.responseCode" class="font-mono font-normal">({{ executionResult.responseCode }})</span>
              </div>
              <div class="mt-1 text-[12px]">{{ executionResult.message }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ───────────── 탭 2: 재처리 이력 ───────────── -->
    <div v-else class="flex flex-1 flex-col overflow-hidden space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-2">
          <select
            v-model="historyTenantFilter"
            @change="refreshHistory"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 테넌트</option>
            <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select
            v-model="historyStorageFilter"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 저장소</option>
            <option value="DATASTORE">Data Store</option>
            <option value="JMS">JMS Queue</option>
          </select>
          <select
            v-model="historyResultFilter"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 결과</option>
            <option value="SUCCESS">성공</option>
            <option value="FAILED">실패</option>
          </select>
        </div>

        <button @click="refreshHistory" class="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-surface-2">
          <RefreshCw class="h-3.5 w-3.5" /> 이력 새로고침
        </button>
      </div>

      <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div class="flex-1 overflow-auto bg-white">
          <table class="w-full min-w-[880px] border-collapse text-[12.5px]">
            <thead class="sticky top-0 z-10 bg-surface-2 text-faint font-semibold border-b border-line">
              <tr>
                <th class="px-4 py-3 text-left">실행 일시</th>
                <th class="px-4 py-3 text-left">테넌트</th>
                <th class="px-4 py-3 text-left">아티팩트</th>
                <th class="px-4 py-3 text-left">저장소 종류</th>
                <th class="px-4 py-3 text-left">Message ID</th>
                <th class="px-4 py-3 text-left">실행자</th>
                <th class="px-4 py-3 text-right">결과</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredHistory.length === 0">
                <td colspan="7" class="py-16 text-center text-muted">
                  재처리 이력이 없습니다.
                </td>
              </tr>
              <tr v-for="h in filteredHistory" :key="h.id" class="border-b border-line/50 transition hover:bg-surface-2">
                <td class="px-4 py-3 font-mono text-muted whitespace-nowrap">{{ h.executedAt }}</td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold', envBadgeClass(h.tenantName)]">
                    {{ h.tenantName }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-ink">{{ h.artifactName }}</td>
                <td class="px-4 py-3">
                  <span
                    v-if="h.storageType === 'DATASTORE'"
                    class="inline-flex items-center gap-1 rounded-full bg-pass-bg border border-pass-line px-2 py-0.5 font-mono text-[11px] text-pass font-semibold"
                  >
                    <Database class="h-3 w-3" /> Data Store
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] px-2 py-0.5 font-mono text-[11px] text-[#7C3AED] font-semibold"
                  >
                    <Layers class="h-3 w-3" /> JMS Queue
                  </span>
                </td>
                <td class="px-4 py-3 font-mono text-muted break-all max-w-[200px]">{{ h.messageId }}</td>
                <td class="px-4 py-3 text-muted">{{ h.executedBy }}</td>
                <td class="px-4 py-3 text-right">
                  <span
                    :class="[
                      'rounded-full border px-2.5 py-0.5 font-mono text-[11.5px] font-semibold',
                      h.result === 'SUCCESS' ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail-line bg-fail-bg text-fail'
                    ]"
                  >
                    {{ h.result === 'SUCCESS' ? '성공 (200)' : '실패' }}
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
      <p class="mb-3">아래 대상으로 메시지를 타겟 엔드포인트로 다시 전송합니다. 계속하시겠습니까?</p>
      <div class="space-y-1.5 rounded-xl border border-line-2 bg-surface-2 p-3.5 text-[12.5px]">
        <div><span class="text-muted">테넌트</span> &bull; {{ currentTenant?.name }}</div>
        <div><span class="text-muted">아티팩트</span> &bull; {{ selectedArtifact?.artifact }}</div>
        <div><span class="text-muted">저장소 종류</span> &bull; <b>{{ targetStorageType === 'DATASTORE' ? 'Data Store' : 'JMS Queue' }}</b></div>
        <div><span class="text-muted">Message ID</span> &bull; <span class="font-mono text-ink">{{ messageId }}</span></div>
      </div>
    </ConfirmModal>

    <!-- 3단계 저장소 매핑 설정 모달 -->
    <StorageMappingModal
      :is-open="isMappingModalOpen"
      :tenant-id="currentTenant?.id || 0"
      :tenant-name="currentTenant?.name || ''"
      :artifact-id="selectedArtifact?.id || ''"
      :artifact-name="selectedArtifact?.artifact || ''"
      :storage-type="activeMappingStorageType"
      :default-detected-name="activeMappingStorageType === 'DATASTORE' ? selectedArtifact?.dataStoreName : selectedArtifact?.queueName"
      @close="isMappingModalOpen = false"
      @saved="handleMappingSaved"
    />
  </div>
</template>
