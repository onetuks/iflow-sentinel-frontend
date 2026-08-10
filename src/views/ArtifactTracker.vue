<script setup lang="ts">
import { ref, computed, onMounted, inject, watch } from 'vue';
import { Search, Download, Trash2, CloudOff, Play, RotateCw } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { TrackerArtifact } from '../services/api';
import type { Tenant } from '../types';

const currentProjectName = inject<any>('currentProject');
const projectsList = inject<any>('projects');

const currentProjectId = computed(() => {
  if (!currentProjectName || !projectsList || !projectsList.value) return undefined;
  const p = projectsList.value.find((p: any) => p.name === currentProjectName.value);
  return p ? p.id : undefined;
});

const tenants = ref<Tenant[]>([]);
const activeTenant = ref('');
const artifacts = ref<TrackerArtifact[]>([]);
const isSyncing = ref(false);

const loadTenantsAndArtifacts = async () => {
  const projectId = currentProjectId.value;
  tenants.value = await apiService.getTenants(projectId);
  if (tenants.value.length > 0) {
    activeTenant.value = tenants.value[0].name;
    artifacts.value = await apiService.getTrackerArtifacts(activeTenant.value);
    console.log("artifacts", artifacts.value);
  } else {
    activeTenant.value = '';
    artifacts.value = [];
  }
};

const syncTenantData = async () => {
  const currentTenant = tenants.value.find(t => t.name === activeTenant.value);
  if (!currentTenant || !currentTenant.id) {
    alert('선택된 테넌트의 ID 정보를 찾을 수 없습니다.');
    return;
  }

  isSyncing.value = true;
  try {
    const res = await apiService.syncTenant(currentTenant.id);
    if (res.status >= 200 && res.status < 300) {
      alert('테넌트의 패키지 및 아티팩트 동기화가 완료되었습니다.');
      artifacts.value = await apiService.getTrackerArtifacts(activeTenant.value);
    } else {
      alert(`동기화에 실패했습니다. (상태 코드: ${res.status})\n백엔드(Spring Boot) 서버를 재시작하였는지 확인해 주세요.`);
    }
  } catch (error) {
    console.error('Failed to sync tenant:', error);
    alert('테넌트 동기화 중 오류가 발생했습니다.');
  } finally {
    isSyncing.value = false;
  }
};

onMounted(async () => {
  await loadTenantsAndArtifacts();
});

watch(currentProjectId, async () => {
  await loadTenantsAndArtifacts();
});

const searchQuery = ref('');
const statusFilter = ref('');

const filteredArtifacts = computed(() => {
  return artifacts.value.filter(a => {
    const matchQuery = a.package.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                       a.artifact.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchStatus = statusFilter.value ? a.status === statusFilter.value : true;
    return matchQuery && matchStatus;
  });
});

const selectedIds = ref<number[]>([]);

const toggleSelectAll = () => {
  if (selectedIds.value.length === filteredArtifacts.value.length && filteredArtifacts.value.length > 0) {
    selectedIds.value = [];
  } else {
    selectedIds.value = filteredArtifacts.value.map(a => a.id);
  }
};

const isAllSelected = computed(() => {
  return filteredArtifacts.value.length > 0 && selectedIds.value.length === filteredArtifacts.value.length;
});

const exportToExcel = () => {
  alert('선택한 항목을 Excel로 내보냅니다.');
};

const deploySelected = () => {
  alert(`${selectedIds.value.length}개의 항목을 Deploy 합니다.`);
};

const undeploySelected = () => {
  alert(`${selectedIds.value.length}개의 항목을 Undeploy 합니다.`);
};

const deleteSelected = () => {
  alert(`${selectedIds.value.length}개의 항목을 삭제합니다.`);
};
</script>

<template>
  <div class="animate-fade flex flex-col h-[calc(100vh-2rem)]">
    <!-- Header -->
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5 shrink-0">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">아티팩트 추적</h1>
        <div class="mt-1 text-[13px] text-muted">테넌트의 아티팩트 배포 상태를 확인하고 관리합니다</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button 
          @click="exportToExcel"
          :disabled="selectedIds.length === 0"
          class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] border border-line bg-white px-4 py-2.5 text-[13px] font-semibold text-ink shadow-sm transition hover:bg-surface-2 disabled:opacity-50 disabled:hover:bg-white disabled:cursor-not-allowed"
        >
          <Download class="h-[15px] w-[15px]" />
          Excel 내보내기
        </button>
      </div>
    </div>
    
    <!-- Tenant Selection -->
    <div class="mb-5 shrink-0">
      <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">테넌트 선택</label>
      <div class="flex items-center gap-2">
        <button 
          v-for="tenant in tenants" 
          :key="tenant.id"
          @click="activeTenant = tenant.name"
          :class="[
            'flex items-center gap-2 rounded-[10px] px-3 py-2 font-mono text-[13px] font-semibold transition border',
            activeTenant === tenant.name ? 'bg-ink text-white border-ink shadow-sm' : 'bg-white text-muted border-line hover:bg-surface-2 hover:text-ink'
          ]"
        >
          <div 
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold shadow-sm transition"
            :class="activeTenant === tenant.name ? 'bg-white/20 text-white' : 'bg-surface text-muted'"
          >
            {{ tenant.name.split(' ')[0][0] }}
          </div>
          {{ tenant.name }}
        </button>
      </div>
    </div>

    <!-- Main Content Area (Table & Actions) -->
    <div class="flex flex-col flex-1 rounded-2xl border border-line bg-surface shadow-md overflow-hidden min-h-0">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between border-b border-line px-5 py-3 gap-3 shrink-0 bg-white">
        <!-- Filters -->
        <div class="flex items-center gap-3 w-full md:w-auto">
          <div class="relative w-full md:w-64">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-faint" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="패키지 또는 아티팩트 검색" 
              class="w-full rounded-[10px] border border-line bg-white py-1.5 pl-9 pr-3 text-[13px] text-ink placeholder-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
            />
          </div>
          <select 
            v-model="statusFilter" 
            class="rounded-[10px] border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition cursor-pointer min-w-[120px]"
          >
            <option value="">모든 상태</option>
            <option value="Deployed">Deployed</option>
            <option value="Undeployed">Undeployed</option>
            <option value="Illusion">Illusion</option>
          </select>
        </div>
        
        <!-- Actions -->
        <div class="flex items-center gap-2">
          <span v-if="selectedIds.length > 0" class="mr-2 text-[12.5px] font-medium text-primary hidden sm:inline-block">
            {{ selectedIds.length }}개 선택됨
          </span>
          <button 
            @click="syncTenantData"
            :disabled="!activeTenant || isSyncing"
            class="flex items-center gap-1.5 rounded-[9px] border border-line-2 bg-surface-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-line-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw :class="['h-3.5 w-3.5', isSyncing ? 'animate-spin text-primary' : '']" />
            Tenant 동기화
          </button>
          <button 
            @click="deploySelected"
            :disabled="selectedIds.length === 0"
            class="flex items-center gap-1.5 rounded-[9px] bg-pass-bg px-3 py-1.5 text-[12.5px] font-semibold text-pass transition hover:bg-pass-bg/80 border border-pass-line disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play class="h-3.5 w-3.5" />
            Deploy
          </button>
          <button 
            @click="undeploySelected"
            :disabled="selectedIds.length === 0"
            class="flex items-center gap-1.5 rounded-[9px] bg-warn-bg px-3 py-1.5 text-[12.5px] font-semibold text-warn-line transition hover:bg-warn-bg/80 border border-warn-line disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CloudOff class="h-3.5 w-3.5" />
            Undeploy
          </button>
          <button 
            @click="deleteSelected"
            :disabled="selectedIds.length === 0"
            class="flex items-center gap-1.5 rounded-[9px] bg-fail-bg px-3 py-1.5 text-[12.5px] font-semibold text-fail transition hover:bg-fail-bg/80 border border-fail-line disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 class="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      <!-- Table Container -->
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full border-collapse min-w-[700px]">
          <thead class="sticky top-0 bg-surface z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              <th class="w-14 border-b border-line px-4.5 py-3 text-center align-middle">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected" 
                  @change="toggleSelectAll" 
                  class="h-4 w-4 rounded border-line text-primary focus:ring-primary cursor-pointer accent-primary"
                />
              </th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">Package</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">Artifact</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint">Runtime</th>
              <th class="border-b border-line px-4.5 py-3 text-center text-[11.5px] font-semibold uppercase tracking-wide text-faint">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isSyncing">
              <td colspan="5" class="py-16 text-center">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <div class="mt-2.5 text-[13px] font-medium text-muted">테넌트 패키지 및 아티팩트를 동기화 중입니다...</div>
              </td>
            </tr>
            <tr v-else-if="filteredArtifacts.length === 0">
              <td colspan="5" class="py-16 text-center text-[13px] text-muted">
                조건에 맞는 아티팩트가 없습니다.
              </td>
            </tr>
            <tr 
              v-else
              v-for="item in filteredArtifacts" 
              :key="item.id" 
              class="transition hover:bg-surface-2 group border-b border-line/50 last:border-b-0"
              :class="{'bg-primary-tint/30 hover:bg-primary-tint/40': selectedIds.includes(item.id)}"
            >
              <td class="px-4.5 py-3.5 text-center align-middle">
                <input 
                  type="checkbox" 
                  :value="item.id" 
                  v-model="selectedIds" 
                  class="h-4 w-4 rounded border-line text-primary focus:ring-primary cursor-pointer accent-primary"
                />
              </td>
              <td class="px-4.5 py-3.5 align-middle font-mono text-[12.5px] text-ink">
                {{ item.package }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-[13px] font-medium text-ink">
                {{ item.artifact }}
              </td>
              <td class="px-4.5 py-3.5 align-middle font-mono text-[12px] text-muted">
                {{ item.runtime }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-center">
                <span 
                  class="inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap"
                  :class="{
                    'bg-pass-bg border-pass-line text-pass': item.status === 'Deployed',
                    'bg-surface-2 border-line text-muted': item.status === 'Undeployed',
                    'bg-fail-bg border-fail-line text-fail': item.status === 'Illusion'
                  }"
                >
                  <span v-if="item.status === 'Deployed'" class="mr-1.5 h-1.5 w-1.5 rounded-full bg-pass"></span>
                  <span v-else-if="item.status === 'Undeployed'" class="mr-1.5 h-1.5 w-1.5 rounded-full bg-muted"></span>
                  <span v-else class="mr-1.5 h-1.5 w-1.5 rounded-full bg-fail"></span>
                  {{ item.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
