<script setup lang="ts">
import { ref, onMounted, inject, computed, watch } from 'vue';
import { apiService } from '../services/api';
import type { Tenant, TenantEmailConfig, LogLevelType } from '../types';
import { 
  Plus, 
  Info, 
  TestTube2, 
  Trash2, 
  Edit2, 
  RotateCw, 
  Mail, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ShieldCheck,
  Server,
  Layers,
  Sparkles
} from 'lucide-vue-next';

// Shared State & Project Context Injected
const currentProjectName = inject<any>('currentProject');
const projectsList = inject<any>('projects');

const currentProjectId = computed(() => {
  if (!currentProjectName || !projectsList || !projectsList.value) return undefined;
  const p = projectsList.value.find((p: any) => p.name === currentProjectName.value);
  return p ? p.id : undefined;
});

const currentProjectTitle = computed(() => currentProjectName?.value || '전체 프로젝트');

const isLoading = ref(true);
const tenants = ref<Tenant[]>([]);
const syncingTenantId = ref<number | null>(null);

// --- Tenant Management State ---
const isTesting = ref(false);
const testResult = ref('');
const showTenantForm = ref(false);
const tenantFormMode = ref<'create' | 'edit'>('create');
const useSeparateInterfaceAuth = ref(false);

const currentTenant = ref<{
  id?: number;
  name: string;
  platformType: string;
  odataUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  interfaceClientId?: string;
  interfaceClientSecret?: string;
  interfaceTokenUrl?: string;
}>({
  name: '',
  platformType: 'CLOUD_FOUNDRY',
  odataUrl: '',
  clientId: '',
  clientSecret: '',
  tokenUrl: '',
  interfaceClientId: '',
  interfaceClientSecret: '',
  interfaceTokenUrl: ''
});

// --- Additional Tenant Features State (Log Level & Email Notification) ---
const activeTab = ref<'logLevel' | 'email'>('logLevel');

// 1. Log Level Batch State
const selectedLogLevel = ref<LogLevelType>('INFO');
const isApplyingLogLevel = ref(false);
const logLevelResult = ref<{ success?: boolean; message?: string }>({});

const availableLogLevels: { value: LogLevelType; label: string; desc: string; color: string }[] = [
  { value: 'INFO', label: 'INFO', desc: '표준 모니터링 로그', color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { value: 'DEBUG', label: 'DEBUG', desc: '상세 디버그 분석', color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { value: 'TRACE', label: 'TRACE', desc: '메시지 페이로드 트레이스', color: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { value: 'WARN', label: 'WARN', desc: '경고 및 주요 이벤트만', color: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100' },
  { value: 'ERROR', label: 'ERROR', desc: '실패 및 심각한 오류만', color: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
  { value: 'NONE', label: 'NONE', desc: '로그 기록 최소화', color: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100' },
];

// 2. Email Notification & SMTP Config State
const emailConfig = ref<TenantEmailConfig>({
  enabled: false,
  smtpHost: '',
  smtpPort: 587,
  security: 'STARTTLS',
  username: '',
  password: '',
  senderEmail: '',
  recipientEmails: ''
});
const isTestingEmail = ref(false);
const isSavingEmail = ref(false);
const emailTestResult = ref<{ success?: boolean; message?: string }>({});
const emailSaveResult = ref<{ success?: boolean; message?: string }>({});

const loadTenants = async () => {
  isLoading.value = true;
  try {
    tenants.value = await apiService.getTenants(currentProjectId.value);
  } catch (err) {
    console.error('Failed to fetch tenants:', err);
  } finally {
    isLoading.value = false;
  }
};

const loadTenantEmailConfig = async (tenantId: number) => {
  try {
    const config = await apiService.getTenantEmailConfig(tenantId);
    if (config) {
      emailConfig.value = { ...config };
    }
  } catch (err) {
    console.error('Failed to load email config:', err);
  }
};

onMounted(loadTenants);

watch(currentProjectId, loadTenants);

// --- Tenant Methods ---
const handleTestConnection = async () => {
  if (!currentTenant.value.odataUrl || !currentTenant.value.clientId || !currentTenant.value.tokenUrl) {
    alert('테스트를 위해 필수 입력값을 모두 채워주세요.');
    return;
  }
  isTesting.value = true;
  testResult.value = '확인 중…';
  try {
    const ifClientId = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientId : currentTenant.value.clientId;
    const ifClientSecret = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientSecret : currentTenant.value.clientSecret;
    const ifTokenUrl = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceTokenUrl : currentTenant.value.tokenUrl;

    const payload = {
      id: currentTenant.value.id,
      projectId: currentProjectId.value || 1,
      name: currentTenant.value.name || 'test-tenant',
      odataUrl: currentTenant.value.odataUrl,
      clientId: currentTenant.value.clientId,
      clientSecret: currentTenant.value.clientSecret,
      tokenUrl: currentTenant.value.tokenUrl,
      interfaceClientId: ifClientId,
      interfaceClientSecret: ifClientSecret,
      interfaceTokenUrl: ifTokenUrl,
      runtimeClientId: ifClientId,
      runtimeClientSecret: ifClientSecret,
      runtimeTokenUrl: ifTokenUrl,
      platformType: currentTenant.value.platformType as any,
      authType: 'OAUTH2_CLIENT_CREDENTIALS' as any
    };
    const res = await apiService.testTenantConnection(payload);
    testResult.value = res.success ? '연결 성공' : '연결 실패';
  } catch (e) {
    testResult.value = '연결 오류';
  }
  isTesting.value = false;
};

const getTestResultClass = () => {
  if (isTesting.value) return '';
  if (testResult.value.includes('실패') || testResult.value.includes('오류')) {
    return 'rounded-full border border-fail/30 bg-fail-bg px-2.5 py-1 text-[11.5px] font-semibold text-fail';
  }
  return 'rounded-full border border-pass-line bg-pass-bg px-2.5 py-1 text-[11.5px] font-semibold text-pass';
};

const handleAddTenantClick = () => {
  tenantFormMode.value = 'create';
  currentTenant.value = {
    name: '',
    platformType: 'CLOUD_FOUNDRY',
    odataUrl: '',
    clientId: '',
    clientSecret: '',
    tokenUrl: '',
    interfaceClientId: '',
    interfaceClientSecret: '',
    interfaceTokenUrl: ''
  };
  useSeparateInterfaceAuth.value = false;
  showTenantForm.value = true;
  testResult.value = '';
  activeTab.value = 'logLevel';
  logLevelResult.value = {};
  emailTestResult.value = {};
  emailSaveResult.value = {};
};

const handleEditTenantClick = async (tenant: Tenant) => {
  tenantFormMode.value = 'edit';
  const hasSeparateAuth = !!(tenant.interfaceClientId || tenant.interfaceTokenUrl || tenant.runtimeClientId || tenant.runtimeTokenUrl);
  currentTenant.value = {
    id: tenant.id,
    name: tenant.name,
    platformType: tenant.platformType,
    odataUrl: tenant.odataUrl,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret || '',
    tokenUrl: tenant.tokenUrl,
    interfaceClientId: tenant.interfaceClientId || tenant.runtimeClientId || '',
    interfaceClientSecret: tenant.interfaceClientSecret || tenant.runtimeClientSecret || '',
    interfaceTokenUrl: tenant.interfaceTokenUrl || tenant.runtimeTokenUrl || ''
  };
  useSeparateInterfaceAuth.value = hasSeparateAuth;
  showTenantForm.value = true;
  testResult.value = '';
  activeTab.value = 'logLevel';
  logLevelResult.value = {};
  emailTestResult.value = {};
  emailSaveResult.value = {};
  selectedLogLevel.value = 'INFO';

  if (tenant.id) {
    await loadTenantEmailConfig(tenant.id);
  }
};

const handleSaveTenant = async () => {
  if (!currentProjectId.value) {
    alert('프로젝트가 선택되지 않았습니다.');
    return;
  }
  
  const ifClientId = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientId : currentTenant.value.clientId;
  const ifClientSecret = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientSecret : currentTenant.value.clientSecret;
  const ifTokenUrl = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceTokenUrl : currentTenant.value.tokenUrl;

  const payload = {
    projectId: currentProjectId.value,
    name: currentTenant.value.name,
    odataUrl: currentTenant.value.odataUrl,
    clientId: currentTenant.value.clientId,
    clientSecret: currentTenant.value.clientSecret,
    tokenUrl: currentTenant.value.tokenUrl,
    interfaceClientId: ifClientId,
    interfaceClientSecret: ifClientSecret,
    interfaceTokenUrl: ifTokenUrl,
    runtimeClientId: ifClientId,
    runtimeClientSecret: ifClientSecret,
    runtimeTokenUrl: ifTokenUrl,
    platformType: currentTenant.value.platformType as any,
    authType: 'OAUTH2_CLIENT_CREDENTIALS' as any
  };

  try {
    let res: { status: number; data?: Tenant } | undefined;
    if (tenantFormMode.value === 'create') {
      res = await apiService.createTenant(payload);
    } else if (tenantFormMode.value === 'edit' && currentTenant.value.id) {
      res = await apiService.updateTenant(currentTenant.value.id, payload);
    }

    if (res && res.status >= 200 && res.status < 300) {
      await loadTenants();
      showTenantForm.value = false;
    } else {
      const errorMsg = (res?.data as any)?.message || `상태 코드: ${res?.status || '오류'}`;
      alert(`테넌트 저장에 실패했습니다. (${errorMsg})`);
    }
  } catch (error: any) {
    console.error('Failed to save tenant', error);
    alert(error.message || '테넌트 저장 중 오류가 발생했습니다.');
  }
};

const handleDeleteTenant = async (tenantId: number) => {
  if (confirm('정말로 이 테넌트를 삭제하시겠습니까?')) {
    try {
      const res = await apiService.deleteTenant(tenantId);
      if (res.status >= 200 && res.status < 300) {
        tenants.value = tenants.value.filter(t => t.id !== tenantId);
        if (currentTenant.value.id === tenantId) {
          showTenantForm.value = false;
        }
      } else {
        alert(`테넌트 삭제에 실패했습니다. (상태 코드: ${res.status})`);
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      alert('테넌트 삭제 중 오류가 발생했습니다.');
    }
  }
};

const handleSyncTenant = async (tenantId: number) => {
  syncingTenantId.value = tenantId;
  try {
    const res = await apiService.syncTenant(tenantId);
    if (res.status >= 200 && res.status < 300) {
      alert('테넌트의 패키지 및 아티팩트 동기화가 완료되었습니다.');
      await loadTenants();
    } else {
      alert(`테넌트 동기화에 실패했습니다. (상태 코드: ${res.status})`);
    }
  } catch (error) {
    console.error('Failed to sync tenant:', error);
    alert('테넌트 동기화 중 오류가 발생했습니다.');
  } finally {
    syncingTenantId.value = null;
  }
};

const handleCancelTenant = () => {
  showTenantForm.value = false;
};

// --- Log Level Batch & Email Config Action Handlers ---
const handleApplyLogLevelBatch = async () => {
  if (!currentTenant.value.id) return;
  isApplyingLogLevel.value = true;
  logLevelResult.value = {};
  try {
    const res = await apiService.batchUpdateTenantLogLevel(currentTenant.value.id, selectedLogLevel.value);
    logLevelResult.value = res;
  } catch (e: any) {
    logLevelResult.value = { success: false, message: e.message || 'Log Level 일괄 적용 중 오류가 발생했습니다.' };
  } finally {
    isApplyingLogLevel.value = false;
  }
};

const handleSaveEmailConfig = async () => {
  if (!currentTenant.value.id) return;
  isSavingEmail.value = true;
  emailSaveResult.value = {};
  try {
    const res = await apiService.saveTenantEmailConfig(currentTenant.value.id, emailConfig.value);
    emailSaveResult.value = res;
  } catch (e: any) {
    emailSaveResult.value = { success: false, message: e.message || '메일 설정 저장 실패' };
  } finally {
    isSavingEmail.value = false;
  }
};

const handleTestEmailConfig = async () => {
  if (!currentTenant.value.id) return;
  isTestingEmail.value = true;
  emailTestResult.value = {};
  try {
    const res = await apiService.testTenantEmailConfig(currentTenant.value.id, emailConfig.value);
    emailTestResult.value = res;
  } catch (e: any) {
    emailTestResult.value = { success: false, message: e.message || '테스트 메일 발송 실패' };
  } finally {
    isTestingEmail.value = false;
  }
};

const getBadgeClass = (tenant: Tenant) => {
  if (tenant.name.includes('DEV')) return 'bg-[#EEF0FE] text-dev';
  if (tenant.name.includes('QAS')) return 'bg-warn-bg text-qas';
  if (tenant.name.includes('PRD')) return 'bg-pass-bg text-prd';
  return 'bg-surface-2 text-muted';
};
</script>

<template>
  <div v-if="isLoading" class="flex h-64 items-center justify-center">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
  </div>

  <div v-else class="animate-fade">
    <!-- Header -->
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">
          {{ currentProjectTitle }} 랜드스케이프
        </h1>
        <div class="mt-1 text-[13px] text-muted">
          이 프로젝트에 등록된 SAP Integration Suite 테넌트를 관리합니다
        </div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button @click="handleAddTenantClick" class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Plus class="h-[15px] w-[15px]" />
          테넌트 추가
        </button>
      </div>
    </div>

    <!-- Info Message -->
    <div class="mb-5 flex gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
      <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
      <span>각 테넌트는 별도의 SAP CPI OData 엔드포인트와 자격증명을 사용합니다. 테넌트 편집 화면 우측의 추가 영역을 통해 Log Level 일괄 적용 및 실패 메일 알림(SMTP)을 설정할 수 있습니다.</span>
    </div>

    <!-- Tenants Grid -->
    <div v-if="tenants.length === 0" class="rounded-2xl border border-line bg-surface p-12 text-center text-muted">
      등록된 테넌트가 없습니다. 우측 상단의 '테넌트 추가' 버튼을 눌러 새 테넌트를 등록해 주세요.
    </div>

    <div v-else class="mb-5 grid grid-cols-1 gap-4.5 md:grid-cols-3">
      <div 
        v-for="tenant in tenants" 
        :key="tenant.id" 
        class="group rounded-2xl border border-line bg-surface p-4.5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer" 
        @click="handleEditTenantClick(tenant)"
      >
        <div class="mb-3.5 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span :class="['rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide', getBadgeClass(tenant)]">
              {{ tenant.name }}
            </span>
            <span class="flex items-center gap-1.5 text-[11px] text-muted">
              <i :class="['h-2 w-2 rounded-full shadow-[0_0_0_3px]', (tenant.status || 'connected') === 'connected' ? 'bg-pass shadow-pass-bg' : 'bg-fail shadow-fail-bg']"></i>
              {{ (tenant.status || 'connected') === 'connected' ? '정상' : '오류' }}
            </span>
          </div>
          <div class="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button 
              @click.stop="handleSyncTenant(tenant.id)" 
              :disabled="syncingTenantId === tenant.id"
              class="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-primary transition disabled:opacity-50" 
              title="Tenant 동기화"
            >
              <RotateCw :class="['h-[14px] w-[14px]', syncingTenantId === tenant.id ? 'animate-spin text-primary' : '']" />
            </button>
            <button @click.stop="handleEditTenantClick(tenant)" class="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-primary transition" title="수정">
              <Edit2 class="h-[14px] w-[14px]" />
            </button>
            <button @click.stop="handleDeleteTenant(tenant.id)" class="rounded p-1.5 text-muted hover:bg-fail-bg hover:text-fail transition" title="삭제">
              <Trash2 class="h-[14px] w-[14px]" />
            </button>
          </div>
        </div>
        <div class="truncate font-mono text-[11.5px] text-muted">{{ tenant.odataUrl }}</div>
        <div class="mt-2.5 font-mono text-[11.5px] text-muted">CF · {{ tenant.packageCount }} 패키지</div>
      </div>
    </div>

    <!-- Tenant Form & Additional Features Container (2-Column Grid) -->
    <div v-if="showTenantForm" class="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-xl transition-all duration-300">
      <div class="mb-5 flex items-center justify-between border-b border-line pb-4">
        <div class="flex items-center gap-2.5">
          <Server class="h-5 w-5 text-primary" />
          <h3 class="m-0 font-disp text-base font-bold text-ink">
            {{ tenantFormMode === 'create' ? '신규 테넌트 등록' : '테넌트 정보 및 확장 설정' }}
          </h3>
          <span class="rounded-full bg-primary-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
            {{ currentTenant.name || '새 테넌트' }}
          </span>
        </div>
        <button @click="handleCancelTenant" class="text-xs font-semibold text-muted hover:text-ink transition">
          닫기 ✕
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- LEFT COLUMN: Primary Tenant Connection & Interface Auth Form (6 Cols) -->
        <div class="lg:col-span-6 flex flex-col justify-between rounded-xl border border-line/70 bg-surface-1/40 p-5">
          <div class="space-y-4">
            <!-- 1. 기본 정보 및 API 관리 인증 정보 (Management / OData) -->
            <div>
              <div class="mb-3 flex items-center justify-between">
                <div class="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <Layers class="h-4 w-4 text-primary" />
                  <span>API 관리 인증 설정 (Management / OData)</span>
                </div>
                <span class="rounded-full bg-primary-tint px-2 py-0.5 font-mono text-[10.5px] font-semibold text-primary">
                  메타데이터/로그 조회용
                </span>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">테넌트 이름</label>
                    <input type="text" v-model="currentTenant.name" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-sans text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="예: S-Oil PRD" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">유형</label>
                    <select v-model="currentTenant.platformType" class="w-full appearance-none rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-sans text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px;">
                      <option value="CLOUD_FOUNDRY">Cloud Foundry</option>
                      <option value="NEO">Neo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">OData API URL</label>
                  <input type="text" v-model="currentTenant.odataUrl" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="https://..." />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Client ID</label>
                    <input type="text" v-model="currentTenant.clientId" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Client ID" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Client Secret</label>
                    <input type="password" v-model="currentTenant.clientSecret" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="••••••••" />
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Token URL</label>
                  <input type="text" v-model="currentTenant.tokenUrl" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="https://..." />
                </div>
              </div>
            </div>

            <!-- 2. 인터페이스(런타임) 호출 전용 인증 정보 (Interface Execution Auth) -->
            <div class="rounded-xl border border-line-2 bg-surface p-3.5 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-[12.5px] font-bold text-ink">
                  <ShieldCheck class="h-4 w-4 text-[#7C3AED]" />
                  <span>인터페이스 호출 권한 인증 정보 (Runtime)</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer gap-2 text-[11.5px] font-semibold text-muted">
                  <input type="checkbox" v-model="useSeparateInterfaceAuth" class="sr-only peer" />
                  <div class="w-8 h-4.5 bg-line-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
                  <span :class="{ 'text-[#7C3AED] font-bold': useSeparateInterfaceAuth }">별도 등록</span>
                </label>
              </div>

              <div v-if="useSeparateInterfaceAuth" class="grid grid-cols-1 gap-3 pt-1 border-t border-line/60">
                <div class="text-[11px] text-muted leading-relaxed">
                  재처리 실행 시 타겟 IFlow 런타임 엔드포인트를 호출할 수 있는 권한을 가진 인증정보를 입력합니다.
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Client ID</label>
                    <input type="text" v-model="currentTenant.interfaceClientId" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15" placeholder="예: sb-..." />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Client Secret</label>
                    <input type="password" v-model="currentTenant.interfaceClientSecret" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Token URL</label>
                  <input type="text" v-model="currentTenant.interfaceTokenUrl" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15" placeholder="https://..." />
                </div>
              </div>
              <div v-else class="rounded-lg bg-surface-2/60 px-3 py-2 text-[11.5px] text-muted flex items-center gap-2">
                <Info class="h-3.5 w-3.5 text-primary shrink-0" />
                <span>API 관리 인증정보(Management Client ID/Secret)를 인터페이스 호출에 공통으로 사용합니다.</span>
              </div>
            </div>
          </div>

          <div class="mt-4 border-t border-line/60 pt-4">
            <div class="mb-3 flex items-center text-[12px] font-mono text-muted">
              <span v-if="testResult" :class="getTestResultClass()">
                {{ testResult }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button 
                @click="handleTestConnection" 
                :disabled="isTesting"
                class="flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[12px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 disabled:opacity-50 cursor-pointer"
              >
                <TestTube2 class="h-3.5 w-3.5" />
                연결 테스트
              </button>
              <div class="flex-1"></div>
              <button @click="handleSaveTenant" class="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:shadow-lg cursor-pointer">
                테넌트 저장
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Extended Features Tab Container (6 Cols) -->
        <div class="lg:col-span-6 rounded-xl border border-line/70 bg-surface-1/40 p-5 flex flex-col justify-between">
          <!-- Mode Guard: When Creating New Tenant -->
          <div v-if="tenantFormMode === 'create'" class="my-auto flex flex-col items-center justify-center p-8 text-center">
            <div class="mb-3 rounded-full bg-primary-tint p-4 text-primary">
              <Sparkles class="h-8 w-8" />
            </div>
            <h4 class="m-0 font-disp text-base font-bold text-ink">추가 관리 기능 준비 완료</h4>
            <p class="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
              테넌트 기본 접속 정보를 먼저 저장해 주세요. 저장이 완료되면 우측 영역에서 <strong>Log Level 일괄 적용</strong> 및 <strong>실패 메시지 메일 알림 설정</strong>을 바로 사용할 수 있습니다.
            </p>
          </div>

          <!-- Mode Active: When Editing Existing Tenant -->
          <div v-else class="flex flex-col h-full justify-between">
            <div>
              <!-- Tab Header Buttons -->
              <div class="mb-4 flex items-center gap-2 border-b border-line pb-3">
                <button 
                  @click="activeTab = 'logLevel'" 
                  :class="[
                    'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-all',
                    activeTab === 'logLevel' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-surface text-muted hover:bg-surface-2 hover:text-ink border border-line-2'
                  ]"
                >
                  <Sliders class="h-4 w-4" />
                  Log Level 일괄 적용
                </button>
                <button 
                  @click="activeTab = 'email'" 
                  :class="[
                    'flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-all',
                    activeTab === 'email' 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-surface text-muted hover:bg-surface-2 hover:text-ink border border-line-2'
                  ]"
                >
                  <Mail class="h-4 w-4" />
                  실패 메일 리포팅 설정
                </button>
              </div>

              <!-- TAB 1: Log Level Batch Control -->
              <div v-if="activeTab === 'logLevel'" class="space-y-4 animate-fade">
                <div class="rounded-lg border border-primary/20 bg-primary-tint/30 p-3.5 text-[12px] leading-relaxed text-[#3B4257]">
                  <div class="font-semibold text-primary mb-0.5 flex items-center gap-1.5">
                    <Info class="h-4 w-4" />
                    SAP Integration Suite Log Level 일괄 제어
                  </div>
                  현재 테넌트에 배포된 모든 Integration Flow 아티팩트의 Message Processing Log Level을 한 번에 원하는 수준으로 변경합니다.
                </div>

                <div>
                  <label class="mb-2 block text-[12.5px] font-bold text-[#3B4257]">적용할 Log Level 선택</label>
                  <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <button
                      v-for="lvl in availableLogLevels"
                      :key="lvl.value"
                      type="button"
                      @click="selectedLogLevel = lvl.value"
                      :class="[
                        'flex flex-col items-start rounded-xl border p-3 text-left transition-all',
                        selectedLogLevel === lvl.value 
                          ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-sm' 
                          : `${lvl.color} opacity-80 hover:opacity-100`
                      ]"
                    >
                      <div class="flex w-full items-center justify-between font-mono text-[13px] font-bold">
                        <span>{{ lvl.label }}</span>
                        <CheckCircle2 v-if="selectedLogLevel === lvl.value" class="h-4 w-4 text-primary" />
                      </div>
                      <span class="mt-1 text-[11px] opacity-80">{{ lvl.desc }}</span>
                    </button>
                  </div>
                </div>

                <!-- Log Level Batch Result Message -->
                <div v-if="logLevelResult.message" :class="[
                  'flex items-center gap-2 rounded-lg border p-3 text-[12px] font-medium',
                  logLevelResult.success ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail/30 bg-fail-bg text-fail'
                ]">
                  <CheckCircle2 v-if="logLevelResult.success" class="h-4 w-4 shrink-0" />
                  <AlertCircle v-else class="h-4 w-4 shrink-0" />
                  <span>{{ logLevelResult.message }}</span>
                </div>
              </div>

              <!-- TAB 2: Email Reporting & SMTP Config -->
              <div v-if="activeTab === 'email'" class="space-y-3.5 animate-fade">
                <!-- Enable Email Alerting Toggle -->
                <div class="flex items-center justify-between rounded-xl border border-line-2 bg-surface p-3 shadow-sm">
                  <div class="flex items-center gap-2.5">
                    <ShieldCheck class="h-5 w-5 text-primary" />
                    <div>
                      <div class="text-[12.5px] font-bold text-ink">실패 메시지 메일 리포팅 활성화</div>
                      <div class="text-[11px] text-muted">테넌트에서 오류 발생 시 등록된 이메일로 즉시 알림 발송</div>
                    </div>
                  </div>
                  <label class="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" v-model="emailConfig.enabled" class="peer sr-only" />
                    <div class="peer h-6 w-11 rounded-full bg-surface-2 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
                  </label>
                </div>

                <!-- SMTP Server Details -->
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-12">
                  <div class="sm:col-span-7">
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">SMTP 서버 주소</label>
                    <input type="text" v-model="emailConfig.smtpHost" class="w-full rounded-[9px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="smtp.office365.com" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">포트</label>
                    <input type="number" v-model="emailConfig.smtpPort" class="w-full rounded-[9px] border border-line-2 bg-surface px-2 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="587" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">보안 프로토콜</label>
                    <select v-model="emailConfig.security" class="w-full rounded-[9px] border border-line-2 bg-surface px-2 py-1.5 font-sans text-[12px] text-ink transition focus:border-primary focus:outline-none">
                      <option value="STARTTLS">STARTTLS</option>
                      <option value="SSL_TLS">SSL/TLS</option>
                      <option value="NONE">None</option>
                    </select>
                  </div>
                </div>

                <!-- SMTP Auth User / Password -->
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">SMTP 인증 계정 (User)</label>
                    <input type="text" v-model="emailConfig.username" class="w-full rounded-[9px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="user@company.com" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">SMTP 비밀번호</label>
                    <input type="password" v-model="emailConfig.password" class="w-full rounded-[9px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="••••••••" />
                  </div>
                </div>

                <!-- Sender & Recipients -->
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">발신자 이메일 (Sender)</label>
                    <input type="text" v-model="emailConfig.senderEmail" class="w-full rounded-[9px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="alert@iflow-sentinel.com" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">수신자 이메일 목록 (쉼표 구분)</label>
                    <input type="text" v-model="emailConfig.recipientEmails" class="w-full rounded-[9px] border border-line-2 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none" placeholder="op1@co.com, op2@co.com" />
                  </div>
                </div>

                <!-- Test / Save Feedback Messages -->
                <div v-if="emailTestResult.message || emailSaveResult.message" class="space-y-1.5 pt-1">
                  <div v-if="emailTestResult.message" :class="[
                    'flex items-center gap-2 rounded-lg border p-2.5 text-[11.5px] font-medium',
                    emailTestResult.success ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail/30 bg-fail-bg text-fail'
                  ]">
                    <CheckCircle2 v-if="emailTestResult.success" class="h-3.5 w-3.5 shrink-0" />
                    <AlertCircle v-else class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ emailTestResult.message }}</span>
                  </div>

                  <div v-if="emailSaveResult.message" :class="[
                    'flex items-center gap-2 rounded-lg border p-2.5 text-[11.5px] font-medium',
                    emailSaveResult.success ? 'border-pass-line bg-pass-bg text-pass' : 'border-fail/30 bg-fail-bg text-fail'
                  ]">
                    <CheckCircle2 v-if="emailSaveResult.success" class="h-3.5 w-3.5 shrink-0" />
                    <AlertCircle v-else class="h-3.5 w-3.5 shrink-0" />
                    <span>{{ emailSaveResult.message }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tab Action Footers -->
            <div class="mt-5 border-t border-line/60 pt-4 flex items-center justify-end gap-2">
              <template v-if="activeTab === 'logLevel'">
                <button 
                  @click="handleApplyLogLevelBatch" 
                  :disabled="isApplyingLogLevel"
                  class="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                >
                  <RotateCw :class="['h-3.5 w-3.5', isApplyingLogLevel ? 'animate-spin' : '']" />
                  Log Level 일괄 적용
                </button>
              </template>

              <template v-if="activeTab === 'email'">
                <button 
                  @click="handleTestEmailConfig" 
                  :disabled="isTestingEmail"
                  class="flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[12px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 disabled:opacity-50"
                >
                  <Send :class="['h-3.5 w-3.5', isTestingEmail ? 'animate-pulse' : '']" />
                  테스트 메일 발송
                </button>
                <button 
                  @click="handleSaveEmailConfig" 
                  :disabled="isSavingEmail"
                  class="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50"
                >
                  <Mail class="h-3.5 w-3.5" />
                  메일 설정 저장
                </button>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
