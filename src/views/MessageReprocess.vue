<script setup lang="ts">
import { ref, computed, onMounted, inject, watch, nextTick } from 'vue';
import {
  RefreshCw, Search, AlertTriangle, CheckCircle2, XCircle, History, PlayCircle,
  Database, Layers, AlertCircle, Clock, FileText, Check, Globe, Copy, Trash2
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
  return Array.from(pkgs).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }));
});

const availableArtifacts = computed(() => {
  return allArtifacts.value
    .filter(a => a.package === selectedPackage.value)
    .sort((a, b) => a.artifact.localeCompare(b.artifact, undefined, { sensitivity: 'base', numeric: true }));
});

const selectedArtifact = computed(() =>
  allArtifacts.value.find(a => String(a.id) === String(selectedArtifactId.value))
);

// ── 아티팩트 재처리 지원 유형 및 저장소 정보 ───────────────────
const currentReprocessType = computed<ReprocessSupportType>(() => {
  return selectedArtifact.value?.reprocessType || 'DATASTORE_ONLY';
});

const targetStorageType = ref<'DATASTORE' | 'JMS'>('DATASTORE');

// 메시지 선택 중 반응형 감시자(Watchers) 연쇄 실행 방지 플래그
const isSelectingLog = ref(false);

// 실패 로그 관련 모든 상태 즉시 완전 초기화 (조회/조건변경 즉시 목록 제거)
const clearAllFailureLogsState = () => {
  mplLogs.value = [];
  selectedMplLog.value = null;
  messageId.value = '';
  lookupResult.value = null;
  executionResult.value = null;
};

// 아티팩트 변경 시 저장소 타겟 자동 설정 및 결과 초기화 (자동 조회는 안 함)
watch(selectedArtifact, async (newArt) => {
  // 메시지 클릭을 통한 자동 매칭일 경우 감시자 연쇄 초기화 및 재조회 방지
  if (isSelectingLog.value) return;

  // 아티팩트 변경 즉시 기존 조회 결과 및 실패 목록 싹 지우기
  clearAllFailureLogsState();

  if (newArt) {
    try {
      const type = await apiService.getReprocessSupportType(newArt.id);
      if (type) {
        newArt.reprocessType = type;
      }
    } catch (e) {
      // ignore
    }

    if (newArt.reprocessType === 'JMS_ONLY') {
      targetStorageType.value = 'JMS';
    } else {
      targetStorageType.value = 'DATASTORE';
    }
  }
});

const fetchArtifacts = async () => {
  allArtifacts.value = [];
  selectedPackage.value = '';
  selectedArtifactId.value = '';
  clearAllFailureLogsState();
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

watch(activeTenantId, async () => {
  clearAllFailureLogsState();
  await fetchArtifacts();
});

watch(selectedPackage, () => {
  if (isSelectingLog.value) return;
  clearAllFailureLogsState();
  selectedArtifactId.value = availableArtifacts.value.length > 0 ? availableArtifacts.value[0].id : '';
});

onMounted(async () => {
  await loadTenantsAndArtifacts();
  await refreshHistory();
});

// ── 최근 MPL 실패 목록 수동 조회 & 메시지 선택 ───────────────
const selectionMode = ref<'mpl_list' | 'manual_id'>('mpl_list');
const mplLogs = ref<MplFailureLog[]>([]);
const isLoadingMpl = ref(false);
const selectedMplLog = ref<MplFailureLog | null>(null);

// 비동기 요청 경쟁 상태(Race Condition) 방지를 위한 시퀀스 ID
let mplFetchRequestId = 0;
let lookupRequestId = 0;
let selectLogRequestId = 0;

// 조회 모드: 'artifact' (특정 아티팩트별 조회) vs 'tenant_all' (테넌트 전체 실패 전수 조사)
const searchScopeMode = ref<'artifact' | 'tenant_all'>('artifact');

watch(searchScopeMode, () => {
  clearAllFailureLogsState();
});

const fetchMplFailures = async () => {
  // 요청 시퀀스 카운터 증가 (최신 요청만 화면에 반영하기 위함)
  const currentRequestId = ++mplFetchRequestId;

  // 1. 새로운 조건으로 검색 시작 시 기존 목록 및 선택 정보 즉시 날리기 & 스피너 활성화
  clearAllFailureLogsState();
  isLoadingMpl.value = true;

  // 2. Vue DOM 업데이트 및 브라우저 Paint 타임 보장 (Batching 스킵 방지)
  await nextTick();
  await new Promise(resolve => setTimeout(resolve, 150));

  if (!currentTenant.value) {
    isLoadingMpl.value = false;
    return;
  }

  try {
    const targetArtifactId = searchScopeMode.value === 'tenant_all'
      ? undefined 
      : (selectedArtifact.value?.artifactId || selectedArtifact.value?.artifact || selectedArtifactId.value);

    const logs = await apiService.getMplFailureLogs(currentTenant.value.id, targetArtifactId);

    // 이전(지연된) 요청의 응답이면 화면 변경 취소/무시
    if (currentRequestId !== mplFetchRequestId) return;

    mplLogs.value = logs;
    // (자동 selectMplLog 호출을 제거하여 사용자가 행을 직접 클릭했을 때만 Body 조회가 실행되도록 함)
  } catch (e) {
    if (currentRequestId !== mplFetchRequestId) return;
    console.error('Failed to fetch MPL failure logs:', e);
    mplLogs.value = [];
  } finally {
    if (currentRequestId === mplFetchRequestId) {
      isLoadingMpl.value = false;
    }
  }
};

const selectMplLog = async (log: MplFailureLog, fromFetchRequestId?: number) => {
  const currentSelectId = ++selectLogRequestId;

  // 지연된 이전 fetchMplFailures 요청으로부터 온 경우 전면 무시 (UI 덮어쓰기 방지)
  if (fromFetchRequestId !== undefined && fromFetchRequestId !== mplFetchRequestId) {
    return;
  }

  isSelectingLog.value = true;
  try {
    selectedMplLog.value = log;
    messageId.value = log.messageId;
    lookupResult.value = null;
    executionResult.value = null;

    // 전체 전수 조사 모드이거나 아티팩트 미선택 시, 해당 실패 로그의 아티팩트를 자동 매칭
    if (log.artifactId && allArtifacts.value.length > 0) {
      const matched = allArtifacts.value.find(a => 
        String(a.id) === String(log.artifactId) || 
        a.artifactId === log.artifactId || 
        a.artifact === log.artifactId
      );
      if (matched) {
        // UI 패키지/아티팩트 선택값을 변경하기 직전 최신 요청인지 엄격히 검증
        if (fromFetchRequestId !== undefined && fromFetchRequestId !== mplFetchRequestId) return;
        if (currentSelectId !== selectLogRequestId) return;

        if (matched.package && selectedPackage.value !== matched.package) {
          selectedPackage.value = matched.package;
        }
        if (selectedArtifactId.value !== matched.id) {
          selectedArtifactId.value = matched.id;
        }
      }
    }

    // 특정 실패 로그 클릭 시 서버의 Message Body 조회 API 호출
    if ((fromFetchRequestId === undefined || fromFetchRequestId === mplFetchRequestId) && currentSelectId === selectLogRequestId) {
      await lookupMessage();
    }
  } finally {
    isSelectingLog.value = false;
  }
};

// ── Message ID & 저장소 조회 ──────────────────────────────────
const messageId = ref('');
const isLooking = ref(false);
const lookupResult = ref<DataStoreEntryLookupResult | null>(null);

const targetArtifactIdForLookup = computed(() => {
  return selectedArtifact.value?.dbId || selectedArtifactId.value || selectedMplLog.value?.artifactId;
});

const canLookup = computed(() => !!targetArtifactIdForLookup.value && messageId.value.trim().length > 0 && currentReprocessType.value !== 'NONE');

const lookupMessage = async () => {
  if (!canLookup.value || !currentTenant.value || !targetArtifactIdForLookup.value) return;
  
  const currentRequestId = ++lookupRequestId;
  isLooking.value = true;
  lookupResult.value = null;
  executionResult.value = null;

  const effectiveStorageName = targetStorageType.value === 'DATASTORE'
    ? selectedArtifact.value?.dataStoreName
    : selectedArtifact.value?.queueName;
  try {
    const res = await apiService.lookupDataStoreEntry(
      currentTenant.value.id,
      targetArtifactIdForLookup.value,
      messageId.value.trim(),
      targetStorageType.value,
      effectiveStorageName
    );

    if (currentRequestId !== lookupRequestId) return;
    lookupResult.value = res;
  } catch (e) {
    if (currentRequestId !== lookupRequestId) return;
    console.error('Lookup failed:', e);
    lookupResult.value = null;
  } finally {
    if (currentRequestId === lookupRequestId) {
      isLooking.value = false;
    }
  }
};

// ── 메시지 본문 포맷팅 (XML / JSON / TEXT) & 유틸 ────────────
function formatXml(xml: string): string {
  if (!xml || typeof xml !== 'string') return '';
  const trimmed = xml.trim();
  if (!trimmed.startsWith('<')) return xml;

  try {
    let formatted = '';
    let indent = 0;
    const tab = '  ';

    const cleanXml = trimmed.replace(/(>)\s*(<)/g, '$1\n$2');
    const lines = cleanXml.split('\n');

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (line.startsWith('</')) {
        if (indent > 0) indent--;
        formatted += tab.repeat(indent) + line + '\n';
      } else if (
        line.startsWith('<?') ||
        line.startsWith('<!') ||
        line.startsWith('<!--') ||
        line.endsWith('/>') ||
        (line.startsWith('<') && line.includes('</') && line.indexOf('</') > line.indexOf('>'))
      ) {
        formatted += tab.repeat(indent) + line + '\n';
      } else if (line.startsWith('<')) {
        formatted += tab.repeat(indent) + line + '\n';
        indent++;
      } else {
        formatted += tab.repeat(indent) + line + '\n';
      }
    }
    return formatted.trim();
  } catch (e) {
    return xml;
  }
}

function formatJson(jsonStr: string): string | null {
  if (!jsonStr || typeof jsonStr !== 'string') return null;
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return null;
  }
}

const detectedContentType = computed<'XML' | 'JSON' | 'TEXT'>(() => {
  const content = lookupResult.value?.messageBody || lookupResult.value?.body || '';
  const trimmed = (typeof content === 'string' ? content : JSON.stringify(content)).trim();
  if (!trimmed) return 'TEXT';
  if (trimmed.startsWith('<')) return 'XML';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'JSON';
    } catch {
      return 'TEXT';
    }
  }
  return 'TEXT';
});

const formattedBody = computed(() => {
  const content = lookupResult.value?.messageBody || lookupResult.value?.body || '';
  if (!content) return '';
  const str = typeof content === 'string' ? content : JSON.stringify(content, null, 2);

  if (detectedContentType.value === 'JSON') {
    const jsonFormatted = formatJson(str);
    if (jsonFormatted) return jsonFormatted;
  } else if (detectedContentType.value === 'XML') {
    return formatXml(str);
  }
  return str;
});

const isCopied = ref(false);
const copyBodyToClipboard = async () => {
  if (!formattedBody.value) return;
  try {
    await navigator.clipboard.writeText(formattedBody.value);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (e) {
    console.error('Failed to copy body:', e);
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
      artifactId: selectedArtifact.value?.dbId || selectedArtifactId.value,
      messageId: messageId.value.trim(),
      storageType: targetStorageType.value,
      storageName: effectiveStorageName,
      reprocessedBy: 'ADMIN',
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
const historyResultFilter = ref<'' | 'SUCCESS' | 'FAILED' | 'PENDING'>('');
const historyStorageFilter = ref<'' | 'DATASTORE' | 'JMS'>('');
const historyMessageIdFilter = ref('');
const isLoadingHistory = ref(false);

const refreshHistory = async () => {
  isLoadingHistory.value = true;
  try {
    history.value = await apiService.getReprocessHistories({
      tenantId: historyTenantFilter.value ? Number(historyTenantFilter.value) : undefined,
      status: historyResultFilter.value || undefined,
      messageId: historyMessageIdFilter.value.trim() || undefined
    });
  } finally {
    isLoadingHistory.value = false;
  }
};

const deleteHistoryItem = async (id: number) => {
  if (!confirm('이 재처리 이력 항목을 삭제하시겠습니까?')) return;
  try {
    await apiService.deleteReprocessHistory(id);
    await refreshHistory();
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
};

const filteredHistory = computed(() => {
  return history.value.filter(h => {
    const currentStatus = (h.status || h.result || '').toUpperCase();
    const matchResult = !historyResultFilter.value || currentStatus === historyResultFilter.value;
    const matchStorage = !historyStorageFilter.value || h.storageType === historyStorageFilter.value;
    const matchMessageId = !historyMessageIdFilter.value.trim() || h.messageId.toLowerCase().includes(historyMessageIdFilter.value.trim().toLowerCase());
    return matchResult && matchStorage && matchMessageId;
  });
});

const envBadgeClass = (tenantName: string) => {
  if (tenantName.includes('PRD')) return 'bg-pass-bg text-prd';
  if (tenantName.includes('QAS')) return 'bg-warn-bg text-qas';
  return 'bg-[#EEF0FE] text-dev';
};

// ── 통합 새로고침 (서버 조회 API 일괄 다시 호출) ───────────────────────────
const isGlobalRefreshing = ref(false);

const handleGlobalRefresh = async () => {
  isGlobalRefreshing.value = true;
  try {
    const prevTenantId = activeTenantId.value;
    const prevPackage = selectedPackage.value;
    const prevArtifactId = selectedArtifactId.value;

    // 1. 테넌트 및 아티팩트 목록 최신화
    if (currentProjectId.value) {
      tenants.value = await apiService.getTenants(currentProjectId.value);
      if (prevTenantId && tenants.value.some(t => t.id === prevTenantId)) {
        activeTenantId.value = prevTenantId;
      }
    }

    if (currentTenant.value) {
      isLoadingArtifacts.value = true;
      try {
        allArtifacts.value = await apiService.getTrackerArtifacts(currentTenant.value.id);
        if (prevPackage && availablePackages.value.includes(prevPackage)) {
          selectedPackage.value = prevPackage;
        }
        if (prevArtifactId && availableArtifacts.value.some(a => String(a.id) === String(prevArtifactId))) {
          selectedArtifactId.value = prevArtifactId;
        }
      } finally {
        isLoadingArtifacts.value = false;
      }
    }

    // 2. 현재 활성 탭에 따른 API 재호출
    if (activeTab.value === 'execute') {
      await fetchMplFailures();
      if (messageId.value.trim() && canLookup.value) {
        await lookupMessage();
      }
    } else {
      await refreshHistory();
    }
  } catch (e) {
    console.error('Global refresh failed:', e);
  } finally {
    isGlobalRefreshing.value = false;
  }
};

// 실패 로그 목록 영역 내 새로고침 핸들러
const handleRefreshMplFailures = async () => {
  await fetchMplFailures();
  if (messageId.value.trim() && canLookup.value) {
    await lookupMessage();
  }
};
</script>

<template>
  <div class="animate-fade space-y-5">
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

      <!-- Header Action Buttons: 새로고침 -->
      <div class="flex items-center gap-2">
        <button
          @click="handleGlobalRefresh"
          :disabled="isGlobalRefreshing || isLoadingMpl || isLoadingArtifacts || isLoadingHistory"
          class="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-2 text-[12.5px] font-bold text-primary shadow-xs transition hover:bg-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          title="서버 조회 API를 다시 호출하여 화면을 최신 상태로 새로고침합니다"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isGlobalRefreshing || isLoadingMpl || isLoadingArtifacts || isLoadingHistory }" />
          <span>{{ isGlobalRefreshing ? '새로고침 중...' : '새로고침' }}</span>
        </button>
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
    <div v-if="activeTab === 'execute'" class="space-y-4">
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

      <!-- 조회 모드 선택 카드 -->
      <div class="rounded-2xl border border-line bg-surface p-4 shadow-sm space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-[12.5px] font-bold text-ink">조회 대상 범위:</span>
            <div class="flex gap-1.5 rounded-xl bg-surface-2 p-1 border border-line-2">
              <button
                @click="searchScopeMode = 'artifact'"
                :class="[
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition',
                  searchScopeMode === 'artifact' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
                ]"
              >
                <Layers class="h-3.5 w-3.5" /> 특정 아티팩트별 조회
              </button>
              <button
                @click="searchScopeMode = 'tenant_all'"
                :class="[
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition',
                  searchScopeMode === 'tenant_all' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-ink'
                ]"
              >
                <Globe class="h-3.5 w-3.5" /> 테넌트 전체 실패 메시지 전수 조사
              </button>
            </div>
          </div>
        </div>

        <!-- 모드 1: 아티팩트별 조회 시 패키지/아티팩트 드롭다운 활성화 -->
        <div v-if="searchScopeMode === 'artifact'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <span class="text-muted font-mono">Store: {{ selectedArtifact.dataStoreName || selectedArtifact.artifact }}</span>
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

        <!-- 모드 2: 테넌트 전체 실패 전수 조사 모드 선택 시 안내 패널 (패키지/아티팩트 영역 완전히 제거) -->
        <div v-else class="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-tint/60 p-4 text-[13px] text-ink">
          <Globe class="h-5 w-5 text-primary shrink-0" />
          <div>
            <div class="font-bold text-primary-600">테넌트 전체 에러 메시지 전수 조사 모드</div>
            <div class="text-[12px] text-muted mt-0.5">
              특정 패키지나 아티팩트 필터 없이 테넌트 전체에서 최근 발생한 모든 실패 메시지(FAILED, ESCALATED, Custom Error)를 수집하여 표시합니다.
            </div>
          </div>
        </div>

        <!-- 미지원 안내 -->
        <div v-if="searchScopeMode === 'artifact' && currentReprocessType === 'NONE'" class="flex items-center gap-2 rounded-xl border border-warn-line bg-warn-bg px-4 py-3 text-[12.5px] text-warn">
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>선택한 아티팩트는 Data Store 또는 JMS Queue 스텝이 없어 <b>자동 조회가 불가능</b>합니다. MPL 상세 로그에서 원본 Body를 직접 확인해 주세요.</span>
        </div>

        <!-- BOTH 타입일 때 저장소 선택 탭 -->
        <div v-if="searchScopeMode === 'artifact' && currentReprocessType === 'BOTH'" class="flex items-center justify-between border-t border-line/60 pt-3">
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

        <!-- 실패 로그 수동 조회 트리거 버튼 영역 -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <div class="text-[12px] text-muted flex items-center gap-1.5">
            <Search class="h-3.5 w-3.5 text-primary" />
            <span v-if="searchScopeMode === 'artifact'">선택한 패키지 및 아티팩트 조건으로 최근 실패 메시지를 조회합니다.</span>
            <span v-else>테넌트 전체에서 발생한 모든 실패 메시지(FAILED / ESCALATED)를 수집하여 조회합니다.</span>
          </div>

          <button
            @click="fetchMplFailures"
            :disabled="isLoadingMpl || (searchScopeMode === 'artifact' && !selectedArtifactId)"
            class="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition hover:bg-primary-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Search class="h-4 w-4" :class="{ 'animate-spin': isLoadingMpl }" />
            <span>{{ isLoadingMpl ? '실패 로그 조회 중...' : '실패 로그 조회' }}</span>
          </button>
        </div>
      </div>

      <!-- 메시지 선택 (최근 MPL 실패 목록 / 수동 ID 입력) -->
      <div v-if="searchScopeMode === 'tenant_all' || currentReprocessType !== 'NONE'" class="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
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
            <div class="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
              <div class="flex items-center gap-2">
                <button @click="handleRefreshMplFailures" :disabled="isLoadingMpl" class="flex items-center gap-1.5 text-primary text-[12px] font-semibold hover:underline disabled:opacity-50 cursor-pointer">
                  <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoadingMpl }" /> 새로고침
                </button>
              </div>
            </div>

            <!-- 실패 로그 목록 & 로딩 오버레이 컨테이너 -->
            <div class="relative min-h-[220px] max-h-[260px] overflow-auto rounded-xl border border-line bg-white">
              <!-- 1. 조회 중(로딩 중) 오버레이: 이전 목록 완벽 가림 & 카드 정중앙 대형 스피너 노출 -->
              <div v-if="isLoadingMpl" class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/95 backdrop-blur-xs p-6 space-y-3">
                <div class="flex items-center justify-center rounded-full bg-primary/10 p-3">
                  <RefreshCw class="h-8 w-8 animate-spin text-primary" />
                </div>
                <div class="text-center space-y-1">
                  <div class="text-[14.5px] font-bold text-ink">실패 메시지 목록을 조회 중입니다...</div>
                  <div class="text-[12px] text-muted">서버에서 최근 MPL 실패 로그를 수집하고 있습니다. 잠시만 기다려 주세요.</div>
                </div>
              </div>

              <!-- 2. 테이블 및 데이터 로드 영역 -->
              <table class="w-full text-left text-[12px] border-collapse">
                <thead class="sticky top-0 bg-surface-2 text-faint font-semibold border-b border-line z-10">
                  <tr>
                    <th class="p-2.5">상태</th>
                    <th class="p-2.5">아티팩트</th>
                    <th class="p-2.5">발생 시각</th>
                    <th class="p-2.5">Message ID</th>
                    <th class="p-2.5">Correlation ID</th>
                    <th class="p-2.5">에러 요약</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="mplLogs.length === 0">
                    <td colspan="6" class="p-10 text-center text-muted bg-surface-2/40">
                      <div class="flex flex-col items-center justify-center gap-2">
                        <div class="rounded-full bg-line-2/40 p-3 text-muted">
                          <CheckCircle2 class="h-6 w-6 text-pass" />
                        </div>
                        <div class="text-[13.5px] font-bold text-ink">최근 7일간 선택 조건에 해당하는 실패 메시지가 없습니다.</div>
                        <div class="text-[12px] text-faint max-w-md">
                          (SAP IS OData 실시간 연동 결과: 목(Mock) 데이터가 존재하지 않으며, 실제 SAP IS에 최근 7일 내 기록된 FAILED/ESCALATED 로그가 0건입니다.)
                        </div>
                        <div class="mt-1 text-[11.5px] text-primary font-medium">
                          💡 메시지 ID를 직접 알고 계신 경우 상단 [Message ID 수동 입력] 탭에서 조회가 가능합니다.
                        </div>
                      </div>
                    </td>
                  </tr>
                  <template v-else>
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
                      <td class="p-2.5 font-mono text-primary font-bold break-all max-w-[150px]" :title="log.artifactId || log.artifactName">
                        {{ log.artifactId || log.artifactName || '-' }}
                      </td>
                      <td class="p-2.5 font-mono text-muted whitespace-nowrap">{{ log.logStart }}</td>
                      <td class="p-2.5 font-mono text-ink break-all max-w-[180px]">{{ log.messageId }}</td>
                      <td class="p-2.5 font-mono text-muted break-all">{{ log.correlationId }}</td>
                      <td class="p-2.5 text-muted truncate max-w-[240px]" :title="log.errorDetail">{{ log.errorDetail || '에러 상세 없음' }}</td>
                    </tr>
                  </template>
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
                class="flex items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50 whitespace-nowrap shrink-0"
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
        </div>

        <!-- 우측: Payload Body 미리보기 및 실행 -->
        <div class="rounded-2xl border border-line bg-surface p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between border-b border-line pb-3 mb-3">
              <div class="flex items-center gap-2">
                <h3 class="m-0 text-[14.5px] font-bold text-ink">Body 미리보기</h3>
                <span
                  v-if="!isLooking && lookupResult?.found && detectedContentType"
                  :class="[
                    'rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold tracking-wider',
                    detectedContentType === 'XML' ? 'bg-[#E0F2FE] text-[#0284C7] border border-[#B9E6FE]' :
                    detectedContentType === 'JSON' ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]' :
                    'bg-surface-2 text-muted border border-line-2'
                  ]"
                >
                  {{ detectedContentType }}
                </span>
              </div>

              <div class="flex items-center gap-2">
                <span v-if="!isLooking && lookupResult?.sizeBytes" class="font-mono text-[11.5px] text-muted">
                  {{ lookupResult.sizeBytes.toLocaleString() }} bytes
                </span>
                <button
                  v-if="!isLooking && lookupResult?.found && formattedBody"
                  @click="copyBodyToClipboard"
                  class="flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink transition hover:bg-surface-2 active:scale-95 shadow-2xs cursor-pointer"
                  title="본문 클립보드 복사"
                >
                  <Check v-if="isCopied" class="h-3.5 w-3.5 text-pass" />
                  <Copy v-else class="h-3.5 w-3.5 text-muted" />
                  <span>{{ isCopied ? '복사 완료' : '복사' }}</span>
                </button>
              </div>
            </div>

            <!-- 1. 조회 중 스피너 로딩 UI -->
            <div v-if="isLooking" class="flex flex-col items-center justify-center min-h-[220px] rounded-xl border border-line bg-surface-2/60 p-6 space-y-3">
              <div class="flex items-center justify-center rounded-full bg-primary/10 p-3">
                <RefreshCw class="h-7 w-7 animate-spin text-primary" />
              </div>
              <div class="text-center space-y-1">
                <div class="text-[13.5px] font-bold text-ink">메시지 본문(Body)을 조회하는 중입니다...</div>
                <div class="text-[11.5px] text-muted">{{ targetStorageType === 'DATASTORE' ? 'Data Store' : 'JMS Queue' }}에서 메시지 페이로드를 가져오고 있습니다.</div>
              </div>
            </div>

            <!-- 2. 본문 조회 성공 (XML/JSON 포맷팅 프리뷰) -->
            <div v-else-if="lookupResult?.found" class="relative group">
              <pre
                class="max-h-[280px] overflow-auto rounded-xl bg-[#131622] p-4 font-mono text-[12px] leading-relaxed text-[#E2E8F0] whitespace-pre-wrap break-all border border-[#2D3748] shadow-inner selection:bg-primary/30"
              >{{ formattedBody || '(본문이 비어있습니다)' }}</pre>
            </div>

            <!-- 3. 본문 미조회 / 미존재 안내 -->
            <div v-else class="flex min-h-[220px] flex-col items-center justify-center text-[12.5px] text-faint border border-dashed border-line rounded-xl p-6 text-center space-y-1 bg-surface-2/20">
              <FileText class="h-6 w-6 text-muted mb-1" />
              <div class="font-medium text-ink">{{ lookupResult?.notFoundReason || 'Message ID를 조회하면 원본 본문이 표시됩니다' }}</div>
              <div class="text-[11.5px] text-muted">선택한 저장소에서 해당 ID의 페이로드가 검색되면 포맷팅된 본문이 이곳에 출력됩니다.</div>
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
    <div v-else class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-surface p-3.5 rounded-2xl border border-line shadow-xs">
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="historyTenantFilter"
            @change="refreshHistory"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 테넌트</option>
            <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <select
            v-model="historyStorageFilter"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 저장소</option>
            <option value="DATASTORE">Data Store</option>
            <option value="JMS">JMS Queue</option>
          </select>
          <select
            v-model="historyResultFilter"
            @change="refreshHistory"
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
          >
            <option value="">모든 상태</option>
            <option value="SUCCESS">성공 (SUCCESS)</option>
            <option value="FAILED">실패 (FAILED)</option>
            <option value="PENDING">대기 중 (PENDING)</option>
          </select>
          <div class="relative">
            <input
              v-model="historyMessageIdFilter"
              type="text"
              placeholder="Message ID 검색..."
              @keyup.enter="refreshHistory"
              class="w-48 rounded-[10px] border border-line bg-white px-3 py-1.5 text-[12.5px] text-ink placeholder-faint outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          @click="refreshHistory"
          :disabled="isLoadingHistory"
          class="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw class="h-3.5 w-3.5 text-primary" :class="{ 'animate-spin': isLoadingHistory }" />
          <span>{{ isLoadingHistory ? '조회 중...' : '새로고침' }}</span>
        </button>
      </div>

      <div class="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
        <div class="bg-white overflow-x-auto">
          <table class="w-full min-w-[960px] border-collapse text-[12.5px]">
            <thead class="sticky top-0 z-10 bg-surface-2 text-faint font-semibold border-b border-line">
              <tr>
                <th class="px-4 py-3 text-left">실행 일시</th>
                <th class="px-4 py-3 text-left">테넌트</th>
                <th class="px-4 py-3 text-left">아티팩트</th>
                <th class="px-4 py-3 text-left">저장소 종류</th>
                <th class="px-4 py-3 text-left">Message ID</th>
                <th class="px-4 py-3 text-left">실행자</th>
                <th class="px-4 py-3 text-left">상태/결과</th>
                <th class="px-4 py-3 text-left">상세 메시지</th>
                <th class="px-4 py-3 text-center">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredHistory.length === 0">
                <td colspan="9" class="py-16 text-center text-muted">
                  <div class="flex flex-col items-center justify-center gap-1.5">
                    <History class="h-6 w-6 text-muted/60" />
                    <span>조회 조건에 해당하는 재처리 이력이 없습니다.</span>
                  </div>
                </td>
              </tr>
              <tr v-for="h in filteredHistory" :key="h.id" class="border-b border-line/50 transition hover:bg-surface-2">
                <td class="px-4 py-3 font-mono text-muted whitespace-nowrap">{{ h.reprocessedAt || h.executedAt }}</td>
                <td class="px-4 py-3">
                  <span :class="['rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold', envBadgeClass(h.tenantName || '')]">
                    {{ h.tenantName }}
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-ink break-all max-w-[140px]">{{ h.artifactName }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
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
                <td class="px-4 py-3 font-mono text-muted break-all max-w-[180px]">{{ h.messageId }}</td>
                <td class="px-4 py-3 text-muted whitespace-nowrap">{{ h.reprocessedBy || h.executedBy || 'ADMIN' }}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                  <span
                    v-if="(h.status || h.result) === 'SUCCESS'"
                    class="rounded-full border border-pass-line bg-pass-bg px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pass"
                  >
                    성공
                  </span>
                  <span
                    v-else-if="(h.status || h.result) === 'PENDING'"
                    class="rounded-full border border-warn-line bg-warn-bg px-2.5 py-0.5 font-mono text-[11px] font-semibold text-warn"
                  >
                    대기 중
                  </span>
                  <span
                    v-else
                    class="rounded-full border border-fail-line bg-fail-bg px-2.5 py-0.5 font-mono text-[11px] font-semibold text-fail"
                  >
                    실패
                  </span>
                </td>
                <td class="px-4 py-3 text-muted truncate max-w-[200px]" :title="h.statusMessage || h.responseMessage">
                  {{ h.statusMessage || h.responseMessage || '-' }}
                </td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      @click="deleteHistoryItem(h.id)"
                      class="rounded-lg p-1 text-muted hover:bg-fail-bg hover:text-fail transition cursor-pointer"
                      title="이력 삭제"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
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
