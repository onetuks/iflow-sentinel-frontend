<script setup lang="ts">
import { ref, onMounted, inject, computed, watch } from 'vue';
import { apiService } from '../services/api';
import type { Tenant } from '../types';
import { Plus, Info, TestTube2, Trash2, Edit2, RotateCw } from 'lucide-vue-next';

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
const currentTenant = ref<{
  id?: number;
  name: string;
  platformType: string;
  odataUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
}>({
  name: '',
  platformType: 'CLOUD_FOUNDRY',
  odataUrl: '',
  clientId: '',
  clientSecret: '',
  tokenUrl: ''
});

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
    const payload = {
      id: currentTenant.value.id,
      projectId: currentProjectId.value || 1,
      name: currentTenant.value.name || 'test-tenant',
      odataUrl: currentTenant.value.odataUrl,
      clientId: currentTenant.value.clientId,
      clientSecret: currentTenant.value.clientSecret,
      tokenUrl: currentTenant.value.tokenUrl,
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
    tokenUrl: ''
  };
  showTenantForm.value = true;
  testResult.value = '';
};

const handleEditTenantClick = (tenant: Tenant) => {
  tenantFormMode.value = 'edit';
  currentTenant.value = {
    id: tenant.id,
    name: tenant.name,
    platformType: tenant.platformType,
    odataUrl: tenant.odataUrl,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret || '',
    tokenUrl: tenant.tokenUrl
  };
  showTenantForm.value = true;
  testResult.value = '';
};

const handleSaveTenant = async () => {
  if (!currentProjectId.value) {
    alert('프로젝트가 선택되지 않았습니다.');
    return;
  }
  
  const payload = {
    projectId: currentProjectId.value,
    name: currentTenant.value.name,
    odataUrl: currentTenant.value.odataUrl,
    clientId: currentTenant.value.clientId,
    clientSecret: currentTenant.value.clientSecret,
    tokenUrl: currentTenant.value.tokenUrl,
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
      <span>각 테넌트는 별도의 SAP CPI OData 엔드포인트와 자격증명을 사용합니다. 사이드바의 프로젝트 스위처에서 활성 프로젝트를 변경하거나 새 프로젝트를 관리할 수 있습니다.</span>
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

    <!-- Tenant Form Modal -->
    <div v-if="showTenantForm" class="rounded-2xl border border-line bg-surface shadow-md max-w-2xl mt-6">
      <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <h3 class="m-0 font-disp text-[14.5px] font-semibold">{{ tenantFormMode === 'create' ? '테넌트 등록' : '테넌트 편집' }}</h3>
        <span class="text-xs font-medium text-faint">{{ currentTenant.name || '새 테넌트' }}</span>
      </div>
      <div class="p-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">테넌트 이름</label>
            <input type="text" v-model="currentTenant.name" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="예: S-Oil PRD" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">유형</label>
            <select v-model="currentTenant.platformType" class="w-full appearance-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;">
              <option value="CLOUD_FOUNDRY">Cloud Foundry</option>
              <option value="NEO">Neo</option>
            </select>
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">OData API URL</label>
          <input type="text" v-model="currentTenant.odataUrl" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="https://..." />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Client ID</label>
            <input type="text" v-model="currentTenant.clientId" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="Client ID 입력" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Client Secret</label>
            <input type="password" v-model="currentTenant.clientSecret" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="••••••••••••" />
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Token URL</label>
          <input type="text" v-model="currentTenant.tokenUrl" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="https://..." />
          <div class="mt-1.5 text-[11.5px] text-faint">Client Credentials · 자격증명은 암호화 저장됩니다.</div>
        </div>

        <!-- 액션 버튼 및 테스트 결과 슬롯 -->
        <div class="mb-3.5 mt-2 flex min-h-[34px] items-center text-[12px] font-mono text-muted">
          <span v-if="testResult" :class="getTestResultClass()">
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
          <button @click="handleCancelTenant" class="flex items-center gap-1.5 rounded-[11px] bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-line-2 hover:text-ink">
            취소
          </button>
          <button @click="handleSaveTenant" class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
            테넌트 저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
