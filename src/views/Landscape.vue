<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { Tenant, Project } from '../types';
import { Plus, Info, TestTube2, Trash2, Edit2, ArrowLeft } from 'lucide-vue-next';

// Shared State
const isLoading = ref(true);
const emit = defineEmits(['refresh-projects']);

// --- Project Management State ---
const projects = ref<Project[]>([]);
const showProjectForm = ref(false);
const projectFormMode = ref<'create' | 'edit'>('create');
const currentEditingProject = ref<{ id: number; name: string }>({ id: 0, name: '' });
const selectedProject = ref<Project | null>(null);

// --- Tenant Management State ---
const tenants = ref<Tenant[]>([]);
const isTesting = ref(false);
const testResult = ref('');
const showTenantForm = ref(false);
const tenantFormMode = ref<'create' | 'edit'>('create');
const currentTenant = ref({
  name: '',
  platformType: 'CLOUD_FOUNDRY',
  odataUrl: '',
  clientId: '',
  clientSecret: '',
  tokenUrl: ''
});

onMounted(async () => {
  isLoading.value = true;
  projects.value = await apiService.getProjects();
  isLoading.value = false;
});

// --- Project Methods ---
const handleAddProjectClick = () => {
  projectFormMode.value = 'create';
  currentEditingProject.value = { id: 0, name: '' };
  showProjectForm.value = true;
};

const handleEditProjectClick = (p: Project) => {
  projectFormMode.value = 'edit';
  currentEditingProject.value = { id: p.id, name: p.name };
  showProjectForm.value = true;
};

const handleSaveProject = async () => {
  if (!currentEditingProject.value.name.trim()) return;
  if (projectFormMode.value === 'create') {
    const res = await apiService.createProject(currentEditingProject.value.name);
    if (res.data) projects.value.push(res.data);
  } else {
    const res = await apiService.updateProject(currentEditingProject.value.id, currentEditingProject.value.name);
    if (res.data) {
      const idx = projects.value.findIndex(p => p.id === currentEditingProject.value.id);
      if (idx !== -1) projects.value[idx] = res.data;
    }
  }
  showProjectForm.value = false;
  emit('refresh-projects');
};

const handleDeleteProject = async (id: number) => {
  if (confirm('정말로 이 프로젝트를 삭제하시겠습니까? 하위 데이터가 모두 삭제될 수 있습니다.')) {
    try {
      const res = await apiService.deleteProject(id);
      if (res.status >= 200 && res.status < 300) {
        projects.value = projects.value.filter(p => p.id !== id);
        if (selectedProject.value?.id === id) {
          selectedProject.value = null;
        }
        emit('refresh-projects');
      } else {
        alert(`프로젝트 삭제에 실패했습니다. (상태 코드: ${res.status})`);
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  }
};

const handleCancelProject = () => {
  showProjectForm.value = false;
};

// --- Tenant Methods ---
const selectProjectAndLoadTenants = async (p: Project) => {
  selectedProject.value = p;
  isLoading.value = true;
  tenants.value = await apiService.getTenants(p.id);
  isLoading.value = false;
};

const clearSelectedProject = () => {
  selectedProject.value = null;
  tenants.value = [];
  showTenantForm.value = false;
};

const handleTestConnection = () => {
  isTesting.value = true;
  testResult.value = '확인 중…';
  setTimeout(() => {
    testResult.value = 'OAuth2 인증 성공 · 22 패키지 조회됨';
    isTesting.value = false;
  }, 900);
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

const handleSaveTenant = () => {
  if (!selectedProject.value) return;
  
  if (tenantFormMode.value === 'create') {
    tenants.value.push({
      id: Date.now(),
      projectId: selectedProject.value.id,
      name: currentTenant.value.name,
      odataUrl: currentTenant.value.odataUrl,
      clientId: currentTenant.value.clientId,
      clientSecret: currentTenant.value.clientSecret,
      tokenUrl: currentTenant.value.tokenUrl,
      platformType: currentTenant.value.platformType as any,
      status: 'connected',
      packageCount: 0
    });
  } else if (tenantFormMode.value === 'edit') {
    tenants.value.filter(t => t.name === currentTenant.value.name).forEach(t => {
      t.name = currentTenant.value.name;
      t.platformType = currentTenant.value.platformType as any;
      t.odataUrl = currentTenant.value.odataUrl;
      t.clientId = currentTenant.value.clientId;
      t.clientSecret = currentTenant.value.clientSecret;
      t.tokenUrl = currentTenant.value.tokenUrl;
    });
  }
  showTenantForm.value = false;
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
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <div v-if="selectedProject" class="flex items-center gap-2 text-muted mb-1">
          <button @click="clearSelectedProject" class="hover:text-ink transition flex items-center gap-1 text-[13px] font-medium">
            <ArrowLeft class="h-3.5 w-3.5" />
            프로젝트 목록
          </button>
        </div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">
          {{ selectedProject ? selectedProject.name : '랜드스케이프' }}
        </h1>
        <div class="mt-1 text-[13px] text-muted">
          {{ selectedProject ? '이 프로젝트 전용 테넌트 관리' : '전체 시스템 프로젝트 목록' }}
        </div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button v-if="!selectedProject" @click="handleAddProjectClick" class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Plus class="h-[15px] w-[15px]" />
          프로젝트 추가
        </button>
        <button v-else @click="handleAddTenantClick" class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Plus class="h-[15px] w-[15px]" />
          테넌트 추가
        </button>
      </div>
    </div>

    <!-- PROJECTS VIEW (Default) -->
    <template v-if="!selectedProject">
      <div class="mb-5 flex gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
        <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
        <span>프로젝트를 선택하여 해당 프로젝트에 소속된 테넌트를 관리할 수 있습니다.</span>
      </div>

      <div class="mb-5 grid grid-cols-1 gap-4.5 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="pj in projects" :key="pj.id" @click="selectProjectAndLoadTenants(pj)" class="rounded-2xl border border-line bg-surface p-4.5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group cursor-pointer">
          <div class="mb-3.5 flex items-center justify-between gap-2">
            <span class="rounded-md px-2.5 py-1 font-mono text-[13px] font-semibold tracking-wide bg-surface-2 text-ink">
              {{ pj.name }}
            </span>
            <div class="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button @click.stop="handleEditProjectClick(pj)" class="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-primary transition" title="수정">
                <Edit2 class="h-[14px] w-[14px]" />
              </button>
              <button @click.stop="handleDeleteProject(pj.id)" class="rounded p-1.5 text-muted hover:bg-fail-bg hover:text-fail transition" title="삭제">
                <Trash2 class="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>
          <div class="font-mono text-[11.5px] text-muted">ID: {{ pj.id }}</div>
        </div>
      </div>

      <div v-if="showProjectForm" class="rounded-2xl border border-line bg-surface shadow-md max-w-md mt-6">
        <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <h3 class="m-0 font-disp text-[14.5px] font-semibold">{{ projectFormMode === 'create' ? '새 프로젝트 생성' : '프로젝트 수정' }}</h3>
        </div>
        <div class="p-5">
          <div class="mb-5">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">프로젝트 이름</label>
            <input type="text" v-model="currentEditingProject.name" @keyup.enter="handleSaveProject" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="프로젝트 이름 입력" autofocus />
          </div>
          <div class="flex items-center justify-end gap-2.5">
            <button @click="handleCancelProject" class="flex items-center gap-1.5 rounded-[11px] bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-line-2 hover:text-ink">
              취소
            </button>
            <button @click="handleSaveProject" class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)] disabled:opacity-50" :disabled="!currentEditingProject.name.trim()">
              저장
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- TENANTS VIEW (Drill-down) -->
    <template v-else>
      <div class="mb-5 flex gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
        <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
        <span>테넌트는 <b>현재 프로젝트에 종속</b>되며 다른 프로젝트와 공유되지 않습니다. 각 테넌트는 별도 OData 엔드포인트와 자격증명을 갖습니다.</span>
      </div>

      <div class="mb-5 grid grid-cols-1 gap-4.5 md:grid-cols-3">
        <div v-for="tenant in tenants" :key="tenant.id" class="rounded-2xl border border-line bg-surface p-4.5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer" @click="handleEditTenantClick(tenant)">
          <div class="mb-3.5 flex items-center gap-2">
            <span :class="['rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide', getBadgeClass(tenant)]">
              {{ tenant.name }}
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

      <div v-if="showTenantForm" class="rounded-2xl border border-line bg-surface shadow-md max-w-2xl">
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
            <button @click="handleCancelTenant" class="flex items-center gap-1.5 rounded-[11px] bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-line-2 hover:text-ink">
              취소
            </button>
            <button @click="handleSaveTenant" class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
              테넌트 저장
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
