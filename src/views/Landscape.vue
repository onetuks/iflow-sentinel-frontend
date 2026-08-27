<script setup lang="ts">
import { ref, onMounted, inject, computed, watch } from 'vue';
import { apiService } from '../services/api';
import type { Tenant, TenantEmailConfig, LogLevel } from '../types';
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
  Sparkles,
  Zap,
  FileJson,
  ClipboardPaste,
  Check
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
const isSavingTenant = ref(false);
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
  interfaceUrl?: string;
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
  interfaceUrl: '',
  interfaceClientId: '',
  interfaceClientSecret: '',
  interfaceTokenUrl: ''
});

// --- Service Key JSON Import State & Methods ---
const showJsonModal = ref(false);
const jsonInput = ref('');
const jsonImportTarget = ref<'management' | 'interface'>('management');
const autoFillName = ref(true);

interface ParsedServiceKey {
  clientId: string;
  clientSecret: string;
  url: string;
  tokenUrl: string;
  suggestedName: string;
  platformType: 'CLOUD_FOUNDRY' | 'NEO';
  hasOauthWrapper: boolean;
}

const parsedJsonResult = computed<{
  isValid: boolean;
  data?: ParsedServiceKey;
  error?: string;
  fieldCount: number;
}>(() => {
  const text = jsonInput.value.trim();
  if (!text) {
    return { isValid: false, fieldCount: 0 };
  }

  try {
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      return { isValid: false, error: '올바른 JSON 구문(Syntax)이 아닙니다. 따옴표와 괄호를 확인해 주세요.', fieldCount: 0 };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { isValid: false, error: 'JSON 루트는 객체 형태({ ... })여야 합니다.', fieldCount: 0 };
    }

    // 탐색할 객체 후보군 순회 (oauth, credentials, credentials.oauth, service_key 등)
    const candidates = [
      parsed.oauth,
      parsed.credentials?.oauth,
      parsed.credentials,
      parsed.service_key?.oauth,
      parsed.service_key,
      parsed
    ].filter(c => c && typeof c === 'object');

    const findField = (keys: string[]): string | undefined => {
      for (const obj of candidates) {
        const objKeys = Object.keys(obj);
        for (const k of keys) {
          const matchKey = objKeys.find(ok => ok.toLowerCase().replace(/[-_]/g, '') === k.toLowerCase().replace(/[-_]/g, ''));
          if (matchKey && typeof obj[matchKey] === 'string' && obj[matchKey].trim() !== '') {
            return obj[matchKey].trim();
          }
        }
      }
      return undefined;
    };

    const clientId = findField(['clientid', 'clientId', 'client_id', 'client-id']);
    const clientSecret = findField(['clientsecret', 'clientSecret', 'client_secret', 'client-secret']);
    const url = findField(['url', 'odataurl', 'odata_url', 'serviceurl', 'service_url', 'apiurl', 'api_url']);
    const tokenUrl = findField(['tokenurl', 'tokenUrl', 'token_url', 'token-url', 'oauthurl', 'oauth_url']);

    let count = 0;
    if (clientId) count++;
    if (clientSecret) count++;
    if (url) count++;
    if (tokenUrl) count++;

    if (count === 0) {
      return {
        isValid: false,
        error: 'JSON에서 clientid, clientsecret, url, tokenurl 등의 인증 필드를 찾을 수 없습니다.',
        fieldCount: 0
      };
    }

    // 테넌트 이름 자동 추출 (URL 서브도메인 기반: https://nanoh2o-is-prd.it-cpi015... -> nanoh2o-is-prd)
    let suggestedName = '';
    if (url) {
      try {
        const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
        const hostParts = parsedUrl.hostname.split('.');
        if (hostParts.length > 0 && hostParts[0]) {
          suggestedName = hostParts[0];
        }
      } catch (_) {
        // url 파싱 실패 시 패스
      }
    }

    return {
      isValid: true,
      data: {
        clientId: clientId || '',
        clientSecret: clientSecret || '',
        url: url || '',
        tokenUrl: tokenUrl || '',
        suggestedName,
        platformType: 'CLOUD_FOUNDRY',
        hasOauthWrapper: !!parsed.oauth
      },
      fieldCount: count
    };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'JSON 파싱 중 오류가 발생했습니다.', fieldCount: 0 };
  }
});

const openJsonModal = (target: 'management' | 'interface' = 'management') => {
  jsonImportTarget.value = target;
  jsonInput.value = '';
  showJsonModal.value = true;
};

const handlePasteFromClipboard = async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text) {
        jsonInput.value = text;
        return;
      }
    }
    alert('클립보드가 비어있거나 권한이 없습니다. 텍스트 입력창에 직접 붙여넣어 주세요 (Ctrl+V).');
  } catch (err) {
    alert('브라우저 클립보드 권한이 필요합니다. 텍스트 입력창에 직접 붙여넣어 주세요 (Ctrl+V).');
  }
};

const handleLoadSampleJson = () => {
  jsonInput.value = JSON.stringify({
    oauth: {
      clientid: "sb-52860ccc-c521-49b8-a3c4-a0841fd6c2e9!b37484|it!b33",
      clientsecret: "224ea09c-da71-4fbd-b447-2daf49e73600$xQ71x3XAuuSDVx53e_BMvO7o_CxgvxuLVG0kRAA-01E=",
      url: "https://nanoh2o-is-prd.it-cpi015.cfapps.ap12.hana.ondemand.com",
      createdate: "2026-06-24T05:20:56.813Z",
      tokenurl: "https://nanoh2o-is-prd.authentication.ap12.hana.ondemand.com/oauth/token"
    }
  }, null, 2);
};

const handleClearJson = () => {
  jsonInput.value = '';
};

const applyJsonData = (autoTest: boolean = false) => {
  if (!parsedJsonResult.value.isValid || !parsedJsonResult.value.data) {
    alert('유효한 Service Key JSON 데이터가 아닙니다.');
    return;
  }

  const data = parsedJsonResult.value.data;

  if (jsonImportTarget.value === 'management') {
    if (data.url) currentTenant.value.odataUrl = data.url;
    if (data.clientId) currentTenant.value.clientId = data.clientId;
    if (data.clientSecret) currentTenant.value.clientSecret = data.clientSecret;
    if (data.tokenUrl) currentTenant.value.tokenUrl = data.tokenUrl;
    if (data.platformType) currentTenant.value.platformType = data.platformType;
    
    // 테넌트 이름 자동 적용
    if (autoFillName.value && data.suggestedName && (!currentTenant.value.name || tenantFormMode.value === 'create')) {
      currentTenant.value.name = data.suggestedName;
    }
  } else {
    // Interface (Runtime) 인증 정보 적용
    useSeparateInterfaceAuth.value = true;
    if (data.url) currentTenant.value.interfaceUrl = data.url;
    if (data.clientId) currentTenant.value.interfaceClientId = data.clientId;
    if (data.clientSecret) currentTenant.value.interfaceClientSecret = data.clientSecret;
    if (data.tokenUrl) currentTenant.value.interfaceTokenUrl = data.tokenUrl;
  }

  showJsonModal.value = false;

  if (autoTest) {
    setTimeout(() => {
      handleTestConnection();
    }, 150);
  }
};

// --- Additional Tenant Features State (Log Level & Email Notification) ---
const activeTab = ref<'logLevel' | 'email'>('logLevel');

// 1. Log Level Batch State (API.md: NONE, INFO, ERROR, DEBUG, TRACE)
const selectedLogLevel = ref<LogLevel>('INFO');
const currentSavedLogLevel = ref<LogLevel | null>(null);
const isLoadingLogLevel = ref(false);
const isApplyingLogLevel = ref(false);
const logLevelResult = ref<{ success?: boolean; message?: string }>({});

// 로그 레벨 순서: NONE, INFO, ERROR, DEBUG, TRACE
const availableLogLevels: { value: LogLevel; label: string; desc: string; color: string }[] = [
  { value: 'NONE', label: 'NONE', desc: '로그 기록 비활성화', color: 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100' },
  { value: 'INFO', label: 'INFO', desc: '표준 모니터링 로그', color: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' },
  { value: 'ERROR', label: 'ERROR', desc: '실패 및 오류 로그만', color: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100' },
  { value: 'DEBUG', label: 'DEBUG', desc: '상세 디버그 분석', color: 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { value: 'TRACE', label: 'TRACE', desc: '메시지 페이로드 트레이스', color: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' },
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

const loadTenantLogLevel = async (tenantId: number) => {
  isLoadingLogLevel.value = true;
  try {
    const config = await apiService.getTenantLogLevel(tenantId);
    if (config && config.logLevel) {
      selectedLogLevel.value = config.logLevel;
      currentSavedLogLevel.value = config.logLevel;
    } else {
      currentSavedLogLevel.value = null;
      selectedLogLevel.value = 'INFO';
    }
  } catch (err) {
    console.error('Failed to load tenant log level:', err);
    currentSavedLogLevel.value = null;
    selectedLogLevel.value = 'INFO';
  } finally {
    isLoadingLogLevel.value = false;
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
    const ifUrl = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceUrl : (currentTenant.value.interfaceUrl || '');
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
      interfaceUrl: ifUrl,
      interfaceClientId: ifClientId,
      interfaceClientSecret: ifClientSecret,
      interfaceTokenUrl: ifTokenUrl,
      runtimeUrl: ifUrl,
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
    interfaceUrl: '',
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
  currentSavedLogLevel.value = null;
  selectedLogLevel.value = 'INFO';
};

const handleEditTenantClick = async (tenant: Tenant) => {
  tenantFormMode.value = 'edit';
  const hasSeparateAuth = !!(
    tenant.interfaceUrl ||
    tenant.runtimeUrl ||
    tenant.interfaceClientId ||
    tenant.interfaceTokenUrl ||
    tenant.runtimeClientId ||
    tenant.runtimeTokenUrl
  );
  currentTenant.value = {
    id: tenant.id,
    name: tenant.name,
    platformType: tenant.platformType,
    odataUrl: tenant.odataUrl,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret || '',
    tokenUrl: tenant.tokenUrl,
    interfaceUrl: tenant.interfaceUrl || tenant.runtimeUrl || '',
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
  currentSavedLogLevel.value = null;
  selectedLogLevel.value = 'INFO';

  if (tenant.id) {
    await Promise.all([
      loadTenantEmailConfig(tenant.id),
      loadTenantLogLevel(tenant.id)
    ]);
  }
};

const handleSaveTenant = async () => {
  if (!currentProjectId.value) {
    alert('프로젝트가 선택되지 않았습니다.');
    return;
  }

  if (!currentTenant.value.name?.trim() || !currentTenant.value.odataUrl?.trim() || !currentTenant.value.clientId?.trim() || !currentTenant.value.tokenUrl?.trim()) {
    alert('테넌트 이름, OData API URL, Client ID, Token URL 등 필수 정보를 모두 입력해 주세요.');
    return;
  }
  
  isSavingTenant.value = true;

  const ifUrl = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceUrl : (currentTenant.value.interfaceUrl || '');
  const ifClientId = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientId : currentTenant.value.clientId;
  const ifClientSecret = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceClientSecret : currentTenant.value.clientSecret;
  const ifTokenUrl = useSeparateInterfaceAuth.value ? currentTenant.value.interfaceTokenUrl : currentTenant.value.tokenUrl;

  const payload = {
    projectId: currentProjectId.value,
    name: currentTenant.value.name.trim(),
    odataUrl: currentTenant.value.odataUrl.trim(),
    clientId: currentTenant.value.clientId.trim(),
    clientSecret: currentTenant.value.clientSecret,
    tokenUrl: currentTenant.value.tokenUrl.trim(),
    interfaceUrl: ifUrl,
    interfaceClientId: ifClientId,
    interfaceClientSecret: ifClientSecret,
    interfaceTokenUrl: ifTokenUrl,
    runtimeUrl: ifUrl,
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
  } finally {
    isSavingTenant.value = false;
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
    if (res.success) {
      currentSavedLogLevel.value = selectedLogLevel.value;
    }
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
    <div v-if="showTenantForm" class="mt-6 rounded-2xl border border-line bg-surface p-6 shadow-xl transition-all duration-300 relative overflow-hidden">
      <!-- Saving Tenant Loading Overlay (입력 및 클릭 완전 차단) -->
      <div v-if="isSavingTenant" class="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl bg-surface/90 backdrop-blur-xs p-6 text-center animate-fade">
        <div class="mb-4 relative flex items-center justify-center">
          <div class="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          <Server class="h-7 w-7 text-primary absolute" />
        </div>
        <h4 class="m-0 font-disp text-base font-bold text-ink">
          {{ tenantFormMode === 'create' ? '신규 테넌트를 등록하고 있습니다' : '테넌트 정보를 업데이트하고 있습니다' }}
        </h4>
        <p class="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted">
          SAP Integration Suite와 통신하여 <strong>Integration Package 및 아티팩트 목록을 동기화</strong>하는 중입니다.<br />
          서버 작업이 완료될 때까지 잠시만 기다려 주세요...
        </p>
        <div class="mt-4 flex items-center gap-2 rounded-full bg-primary-tint px-3.5 py-1.5 text-xs font-semibold text-primary shadow-xs">
          <RotateCw class="h-3.5 w-3.5 animate-spin" />
          <span>동기화 진행 중 (입력 및 조작이 일시 제한됩니다)</span>
        </div>
      </div>

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
        <button @click="!isSavingTenant && handleCancelTenant()" :disabled="isSavingTenant" class="text-xs font-semibold text-muted hover:text-ink transition disabled:opacity-40 disabled:cursor-not-allowed">
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
                <div class="flex items-center gap-2">
                  <button 
                    type="button"
                    @click="openJsonModal('management')"
                    :disabled="isSavingTenant"
                    class="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-tint px-2.5 py-1 text-[11.5px] font-bold text-primary transition hover:bg-primary hover:text-white cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="SAP BTP Service Key JSON을 붙여넣어 자동으로 입력합니다"
                  >
                    <Zap class="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>JSON 자동 완성</span>
                  </button>
                  <span class="rounded-full bg-surface-2 border border-line px-2 py-0.5 font-mono text-[10.5px] font-semibold text-muted">
                    메타데이터/로그 조회용
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">테넌트 이름</label>
                    <input type="text" v-model="currentTenant.name" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-sans text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" placeholder="예: S-Oil PRD" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">유형</label>
                    <select v-model="currentTenant.platformType" :disabled="isSavingTenant" class="w-full appearance-none rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-sans text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px;">
                      <option value="CLOUD_FOUNDRY">Cloud Foundry</option>
                      <option value="NEO">Neo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">OData API URL</label>
                  <input type="text" v-model="currentTenant.odataUrl" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" placeholder="https://..." />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Client ID</label>
                    <input type="text" v-model="currentTenant.clientId" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" placeholder="Client ID" />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Client Secret</label>
                    <input type="password" v-model="currentTenant.clientSecret" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" placeholder="••••••••" />
                  </div>
                </div>

                <div>
                  <label class="mb-1 block text-[11.5px] font-semibold text-[#3B4257]">Management Token URL</label>
                  <input type="text" v-model="currentTenant.tokenUrl" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60" placeholder="https://..." />
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
                <div class="flex items-center gap-3">
                  <button 
                    v-if="useSeparateInterfaceAuth"
                    type="button"
                    @click="openJsonModal('interface')"
                    :disabled="isSavingTenant"
                    class="flex items-center gap-1 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-2 py-0.5 text-[11px] font-bold text-[#7C3AED] transition hover:bg-[#7C3AED] hover:text-white cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title="런타임 전용 Service Key JSON 붙여넣기"
                  >
                    <Zap class="h-3 w-3 text-amber-500 fill-amber-500" />
                    <span>JSON 붙여넣기</span>
                  </button>
                  <label class="relative inline-flex items-center cursor-pointer gap-2 text-[11.5px] font-semibold text-muted">
                    <input type="checkbox" v-model="useSeparateInterfaceAuth" :disabled="isSavingTenant" class="sr-only peer" />
                    <div class="w-8 h-4.5 bg-line-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#7C3AED]"></div>
                    <span :class="{ 'text-[#7C3AED] font-bold': useSeparateInterfaceAuth }">별도 등록</span>
                  </label>
                </div>
              </div>

              <div v-if="useSeparateInterfaceAuth" class="grid grid-cols-1 gap-3 pt-1 border-t border-line/60">
                <div class="text-[11px] text-muted leading-relaxed">
                  재처리 실행 시 타겟 IFlow 런타임 엔드포인트를 호출할 수 있는 런타임 URL 및 인증정보를 입력합니다.
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Runtime URL (인터페이스 호출 주소)</label>
                  <input type="text" v-model="currentTenant.interfaceUrl" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 disabled:opacity-60" placeholder="예: https://eXXXX-iflmap.hcisbp.eu1.hana.ondemand.com (또는 https://...-rt...)" />
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Client ID</label>
                    <input type="text" v-model="currentTenant.interfaceClientId" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 disabled:opacity-60" placeholder="예: sb-..." />
                  </div>
                  <div>
                    <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Client Secret</label>
                    <input type="password" v-model="currentTenant.interfaceClientSecret" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 disabled:opacity-60" placeholder="••••••••" />
                  </div>
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-semibold text-[#3B4257]">Interface Token URL</label>
                  <input type="text" v-model="currentTenant.interfaceTokenUrl" :disabled="isSavingTenant" class="w-full rounded-[10px] border border-line-2 bg-surface px-3 py-1.5 font-mono text-[12px] text-ink transition focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/15 disabled:opacity-60" placeholder="https://..." />
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
                :disabled="isTesting || isSavingTenant"
                class="flex items-center gap-1.5 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[12px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <TestTube2 class="h-3.5 w-3.5" />
                연결 테스트
              </button>
              <div class="flex-1"></div>
              <button 
                @click="handleSaveTenant" 
                :disabled="isSavingTenant"
                class="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCw v-if="isSavingTenant" class="h-3.5 w-3.5 animate-spin" />
                <span>{{ isSavingTenant ? '테넌트 등록 중…' : '테넌트 저장' }}</span>
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
                    SAP Integration Suite Log Level 일괄 제어 (PUT /api/tenants/{id}/log-level)
                  </div>
                  지정한 로그 레벨을 DB에 저장하고 해당 테넌트에 배포된(<code>STARTED</code>) 아티팩트 전체에 즉시 반영합니다. 이후 10분마다 백엔드 스케줄러가 저장된 설정을 배포된 아티팩트 전체에 지속적으로 재적용(Drift Correction)합니다.
                </div>

                <div>
                  <div class="mb-2 flex items-center justify-between">
                    <label class="text-[12.5px] font-bold text-[#3B4257]">적용할 Log Level 선택</label>
                    <div v-if="currentSavedLogLevel" class="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted">
                      <span>현재 DB 설정:</span>
                      <span class="rounded bg-primary-tint px-2 py-0.5 font-mono text-primary font-bold">
                        {{ currentSavedLogLevel }}
                      </span>
                    </div>
                    <div v-else-if="!isLoadingLogLevel" class="text-[11px] text-muted">
                      (저장된 설정 없음 - 기본값)
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    <button
                      v-for="lvl in availableLogLevels"
                      :key="lvl.value"
                      type="button"
                      @click="selectedLogLevel = lvl.value"
                      :class="[
                        'flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer',
                        selectedLogLevel === lvl.value 
                          ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-sm' 
                          : `${lvl.color} opacity-80 hover:opacity-100`
                      ]"
                    >
                      <div class="flex w-full items-center justify-between font-mono text-[13px] font-bold">
                        <span>{{ lvl.label }}</span>
                        <CheckCircle2 v-if="selectedLogLevel === lvl.value" class="h-4 w-4 text-primary" />
                      </div>
                      <span class="mt-1 text-[11px] opacity-80 leading-snug">{{ lvl.desc }}</span>
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

    <!-- ========================================================================= -->
    <!-- Service Key JSON Import & Auto-Fill Modal                                   -->
    <!-- ========================================================================= -->
    <div v-if="showJsonModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade">
      <div class="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all">
        <!-- Modal Header -->
        <div class="mb-4 flex items-center justify-between border-b border-line pb-4">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Zap class="h-5 w-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 class="m-0 font-disp text-base font-bold text-ink flex items-center gap-2">
                <span>SAP BTP Service Key JSON 가져오기</span>
                <span class="rounded-full bg-primary-tint px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {{ jsonImportTarget === 'management' ? 'Management (OData)' : 'Interface (Runtime)' }}
                </span>
              </h3>
              <p class="mt-0.5 text-[12px] text-muted">
                BTP Service Key JSON을 붙여넣으면 클라이언트 ID, Secret, URL 등을 즉시 파싱하여 입력합니다.
              </p>
            </div>
          </div>
          <button @click="showJsonModal = false" class="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink transition cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Target Selector & Quick Action Bar -->
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
          <!-- Target Radio Tabs -->
          <div class="flex rounded-lg border border-line-2 bg-surface-2 p-0.5 text-xs font-semibold">
            <button 
              type="button"
              @click="jsonImportTarget = 'management'"
              :class="[
                'rounded-md px-3 py-1.5 transition cursor-pointer',
                jsonImportTarget === 'management' ? 'bg-surface text-primary shadow-xs font-bold' : 'text-muted hover:text-ink'
              ]"
            >
              Management API (OData)
            </button>
            <button 
              type="button"
              @click="jsonImportTarget = 'interface'"
              :class="[
                'rounded-md px-3 py-1.5 transition cursor-pointer',
                jsonImportTarget === 'interface' ? 'bg-surface text-[#7C3AED] shadow-xs font-bold' : 'text-muted hover:text-ink'
              ]"
            >
              Interface 호출 전용 (Runtime)
            </button>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-1.5">
            <button 
              type="button"
              @click="handlePasteFromClipboard"
              class="flex items-center gap-1 rounded-lg border border-line-2 bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-ink shadow-xs hover:bg-surface-2 transition cursor-pointer"
            >
              <ClipboardPaste class="h-3.5 w-3.5 text-primary" />
              <span>클립보드 붙여넣기</span>
            </button>
            <button 
              type="button"
              @click="handleLoadSampleJson"
              class="flex items-center gap-1 rounded-lg border border-line-2 bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-muted hover:text-ink hover:bg-surface-2 transition cursor-pointer"
            >
              <FileJson class="h-3.5 w-3.5" />
              <span>예시 JSON</span>
            </button>
            <button 
              v-if="jsonInput"
              type="button"
              @click="handleClearJson"
              class="rounded-lg px-2 py-1 text-[11.5px] font-semibold text-fail hover:bg-fail-bg transition cursor-pointer"
            >
              지우기
            </button>
          </div>
        </div>

        <!-- JSON Textarea Input -->
        <div class="relative mb-3">
          <textarea
            v-model="jsonInput"
            rows="7"
            class="w-full rounded-xl border border-line-2 bg-surface px-3.5 py-3 font-mono text-[12px] leading-relaxed text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
            placeholder='{
  "oauth": {
    "clientid": "sb-...",
    "clientsecret": "...",
    "url": "https://<tenant>.it-cpi015.cfapps....",
    "tokenurl": "https://<tenant>.authentication..../oauth/token"
  }
}'
          ></textarea>
        </div>

        <!-- Real-time Live Parsing Status / Preview -->
        <div class="mb-4">
          <!-- Parsing Success Card -->
          <div v-if="parsedJsonResult.isValid && parsedJsonResult.data" class="rounded-xl border border-pass-line bg-pass-bg/60 p-3.5 text-[12px] space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5 font-bold text-pass">
                <CheckCircle2 class="h-4 w-4 shrink-0" />
                <span>Service Key 파싱 성공 ({{ parsedJsonResult.fieldCount }}개 인증 필드 감지)</span>
              </div>
              <span v-if="parsedJsonResult.data.hasOauthWrapper" class="rounded bg-pass/10 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-pass">
                oauth 객체 감지
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-ink">
              <div class="truncate bg-surface/80 rounded-lg p-2 border border-pass-line/50">
                <span class="font-bold text-muted block mb-0.5">Target URL:</span>
                <span class="text-ink font-semibold">{{ parsedJsonResult.data.url || '(미포함)' }}</span>
              </div>
              <div class="truncate bg-surface/80 rounded-lg p-2 border border-pass-line/50">
                <span class="font-bold text-muted block mb-0.5">Client ID:</span>
                <span class="text-ink font-semibold">{{ parsedJsonResult.data.clientId || '(미포함)' }}</span>
              </div>
              <div class="truncate bg-surface/80 rounded-lg p-2 border border-pass-line/50">
                <span class="font-bold text-muted block mb-0.5">Token URL:</span>
                <span class="text-ink font-semibold">{{ parsedJsonResult.data.tokenUrl || '(미포함)' }}</span>
              </div>
              <div class="truncate bg-surface/80 rounded-lg p-2 border border-pass-line/50">
                <span class="font-bold text-muted block mb-0.5">Client Secret:</span>
                <span class="text-pass font-semibold">{{ parsedJsonResult.data.clientSecret ? '•••••••• (포함됨)' : '(미포함)' }}</span>
              </div>
            </div>

            <!-- Auto-Fill Tenant Name Option (For Management Target) -->
            <div v-if="jsonImportTarget === 'management' && parsedJsonResult.data.suggestedName" class="flex items-center justify-between pt-1 border-t border-pass-line/40">
              <label class="flex items-center gap-2 cursor-pointer text-[11.5px] font-semibold text-ink">
                <input type="checkbox" v-model="autoFillName" class="rounded text-primary focus:ring-primary h-4 w-4" />
                <span>추출된 테넌트 이름 자동 반영:</span>
                <span class="rounded bg-white px-2 py-0.5 font-mono text-primary font-bold border border-primary/20">
                  {{ parsedJsonResult.data.suggestedName }}
                </span>
              </label>
            </div>
          </div>

          <!-- Parsing Error Card -->
          <div v-else-if="parsedJsonResult.error" class="flex items-start gap-2 rounded-xl border border-fail/30 bg-fail-bg/70 p-3 text-[12px] text-fail">
            <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <div class="font-bold">JSON 파싱 오류</div>
              <div class="text-[11.5px] opacity-90">{{ parsedJsonResult.error }}</div>
            </div>
          </div>

          <!-- Empty Guide Card -->
          <div v-else class="rounded-xl border border-line-2 bg-surface-2/60 p-3 text-[11.5px] text-muted flex items-center gap-2">
            <Info class="h-4 w-4 text-primary shrink-0" />
            <span>BTP Cockpit에서 생성된 Service Key JSON 전체를 붙여넣으면 위 폼의 인증 필드에 자동 매핑됩니다.</span>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <div class="flex items-center justify-end gap-2 border-t border-line pt-4">
          <button 
            type="button"
            @click="showJsonModal = false"
            class="rounded-[10px] border border-line-2 bg-surface px-4 py-2 text-[12.5px] font-semibold text-muted hover:bg-surface-2 hover:text-ink transition cursor-pointer"
          >
            취소
          </button>
          <button 
            type="button"
            @click="applyJsonData(false)"
            :disabled="!parsedJsonResult.isValid"
            class="flex items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:bg-primary-600 disabled:opacity-50 cursor-pointer"
          >
            <Check class="h-4 w-4" />
            폼에 값 채워넣기
          </button>
          <button 
            v-if="jsonImportTarget === 'management'"
            type="button"
            @click="applyJsonData(true)"
            :disabled="!parsedJsonResult.isValid"
            class="flex items-center gap-1.5 rounded-[10px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2 text-[12.5px] font-semibold text-white shadow-md transition hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            <Zap class="h-4 w-4 fill-white" />
            폼에 채우고 바로 연결 테스트
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
