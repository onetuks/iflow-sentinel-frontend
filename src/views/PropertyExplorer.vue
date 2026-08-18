<script setup lang="ts">
import { ref, computed, onMounted, inject, watch } from 'vue';
import { Sliders, Search, X, Package, FileText } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { Tenant } from '../types';
import type { TrackerArtifact } from '../services/api';

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
const isLoading = ref(false);
const searchQuery = ref('');

// 모달 상태
const isModalOpen = ref(false);
const isModalLoading = ref(false);
const selectedArtifactItem = ref<TrackerArtifact | null>(null);
const parameters = ref<any[]>([]);

const loadTenantsAndArtifacts = async () => {
  try {
    isLoading.value = true;
    const data = await apiService.getTenants(currentProjectId.value);
    tenants.value = data;
    if (tenants.value.length > 0) {
      if (!activeTenant.value || !tenants.value.some(t => t.name === activeTenant.value)) {
        activeTenant.value = tenants.value[0].name;
      }
      await loadArtifacts();
    } else {
      activeTenant.value = '';
      artifacts.value = [];
    }
  } catch (e) {
    console.error('Failed to load tenants:', e);
    tenants.value = [];
    artifacts.value = [];
  } finally {
    isLoading.value = false;
  }
};

const loadArtifacts = async () => {
  const currentTenantObj = tenants.value.find(t => t.name === activeTenant.value);
  if (currentTenantObj && currentTenantObj.id) {
    isLoading.value = true;
    try {
      artifacts.value = await apiService.getTrackerArtifacts(currentTenantObj.id);
    } catch (e) {
      console.error('Failed to load artifacts:', e);
      artifacts.value = [];
    } finally {
      isLoading.value = false;
    }
  } else {
    artifacts.value = [];
  }
};

onMounted(async () => {
  await loadTenantsAndArtifacts();
});

watch(currentProjectId, async () => {
  await loadTenantsAndArtifacts();
});

watch(activeTenant, async () => {
  await loadArtifacts();
});

const filteredArtifacts = computed(() => {
  if (!searchQuery.value) return artifacts.value;
  const q = searchQuery.value.toLowerCase();
  return artifacts.value.filter(a => 
    a.package.toLowerCase().includes(q) ||
    a.artifact.toLowerCase().includes(q)
  );
});

// Property 모달 열기
const openPropertyModal = async (artifactItem: TrackerArtifact) => {
  selectedArtifactItem.value = artifactItem;
  isModalOpen.value = true;
  isModalLoading.value = true;
  parameters.value = [];

  const currentTenantObj = tenants.value.find(t => t.name === activeTenant.value);
  if (!currentTenantObj) {
    isModalLoading.value = false;
    return;
  }

  try {
    const targetArtifactId = String(artifactItem.artifactId || artifactItem.id);
    const version = artifactItem.runtime && artifactItem.runtime !== '-' ? artifactItem.runtime : '1.0.0';
    const configuredParams = await apiService.getConfiguredParameters(currentTenantObj.id, targetArtifactId, version);
    
    if (Array.isArray(configuredParams) && configuredParams.length > 0) {
      parameters.value = configuredParams.map((cp: any) => ({
        name: cp.name,
        defaultValue: cp.defaultValue || '-',
        configuredValue: cp.configuredValue || '-',
        description: cp.dataType || 'OData Configuration Parameter'
      }));
    } else {
      parameters.value = [];
    }
  } catch (e) {
    console.error('Failed to fetch property parameters:', e);
    parameters.value = [];
  } finally {
    isModalLoading.value = false;
  }
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedArtifactItem.value = null;
  parameters.value = [];
};
</script>

<template>
  <div class="animate-fade flex flex-col h-[calc(100vh-2rem)]">
    <!-- Header -->
    <div class="mb-6 shrink-0">
      <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">프로퍼티 탐색기</h1>
      <div class="mt-1 text-[13px] text-muted">테넌트의 아티팩트를 선택하여 선언된 External Parameter(Property)를 조회합니다</div>
    </div>
    
    <!-- Tenant Selection -->
    <div class="mb-5 shrink-0">
      <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">테넌트 선택</label>
      <div class="flex items-center gap-2 flex-wrap">
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

    <!-- Main Content Area (Table) -->
    <div class="flex flex-col flex-1 rounded-2xl border border-line bg-surface shadow-md overflow-hidden min-h-0">
      <!-- Toolbar -->
      <div class="flex items-center justify-between border-b border-line px-5 py-3 gap-3 shrink-0 bg-white">
        <div class="relative w-full sm:w-72">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-[15px] w-[15px] text-faint" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="패키지 또는 아티팩트 검색" 
            class="w-full rounded-[10px] border border-line bg-white py-1.5 pl-9 pr-3 text-[13px] text-ink placeholder-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition"
          />
        </div>
        <div class="text-[12.5px] font-medium text-muted">
          총 <span class="font-bold text-ink">{{ filteredArtifacts.length }}</span>개 아티팩트
        </div>
      </div>

      <!-- Table -->
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full border-collapse min-w-[700px]">
          <thead class="sticky top-0 bg-surface z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/3">패키지 (Package)</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/3">아티팩트 (Artifact)</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/6">런타임/버전</th>
              <th class="border-b border-line px-4.5 py-3 text-right text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/6 pr-6">Property</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="4" class="py-16 text-center">
                <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <div class="mt-2.5 text-[13px] font-medium text-muted">아티팩트 목록을 불러오는 중입니다...</div>
              </td>
            </tr>
            <tr v-else-if="filteredArtifacts.length === 0">
              <td colspan="4" class="py-16 text-center text-[13px] text-muted">
                조건에 맞는 아티팩트가 없습니다.
              </td>
            </tr>
            <tr 
              v-else
              v-for="item in filteredArtifacts" 
              :key="item.id" 
              @click="openPropertyModal(item)"
              class="transition hover:bg-surface-2 cursor-pointer group border-b border-line/50 last:border-b-0"
            >
              <td class="px-4.5 py-3.5 align-middle text-[13px] font-medium text-ink">
                <div class="flex items-center gap-2">
                  <Package class="h-4 w-4 text-faint group-hover:text-primary transition" />
                  <span>{{ item.package }}</span>
                </div>
              </td>
              <td class="px-4.5 py-3.5 align-middle text-[13px] font-bold text-ink">
                <div class="flex items-center gap-2">
                  <FileText class="h-4 w-4 text-faint group-hover:text-primary transition" />
                  <span>{{ item.artifact }}</span>
                </div>
              </td>
              <td class="px-4.5 py-3.5 align-middle font-mono text-[12.5px] text-muted">
                {{ item.runtime }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-right pr-6">
                <button 
                  @click.stop="openPropertyModal(item)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-tint/50 px-3 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary hover:text-white shadow-sm"
                >
                  <Sliders class="h-3.5 w-3.5" />
                  Property 조회
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Property Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade">
      <div class="relative w-full max-w-4xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
              <Sliders class="h-5 w-5" />
            </div>
            <div>
              <h3 class="m-0 text-[16px] font-bold text-ink">
                {{ selectedArtifactItem?.artifact }}
              </h3>
              <div class="text-[12px] text-muted">
                패키지: {{ selectedArtifactItem?.package }} | 버전: {{ selectedArtifactItem?.runtime }}
              </div>
            </div>
          </div>
          <button 
            @click="closeModal" 
            class="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink transition"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-auto p-6 bg-white">
          <div v-if="isModalLoading" class="py-20 text-center">
            <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <div class="mt-3 text-[13.5px] font-medium text-muted">External Parameter(Property) 정보를 불러오는 중입니다...</div>
          </div>
          
          <div v-else-if="parameters.length === 0" class="py-16 text-center text-muted">
            <Sliders class="mx-auto h-10 w-10 text-faint mb-2" />
            <div class="text-[14px] font-medium">선택한 아티팩트에 설정된 외부 프로퍼티가 없습니다.</div>
          </div>

          <div v-else class="overflow-x-auto rounded-xl border border-line">
            <table class="w-full border-collapse">
              <thead>
                <tr class="bg-surface border-b border-line">
                  <th class="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Name</th>
                  <th class="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Default Value</th>
                  <th class="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Configured Value</th>
                  <th class="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Description</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-for="(param, index) in parameters" :key="index" class="hover:bg-surface-2/60 transition">
                  <td class="px-4 py-3 font-mono text-[12.5px] font-bold text-ink align-middle">
                    {{ param.name }}
                  </td>
                  <td class="px-4 py-3 text-[12.5px] text-ink break-all align-middle">
                    {{ param.defaultValue }}
                  </td>
                  <td class="px-4 py-3 text-[12.5px] align-middle break-all">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-bold text-primary">{{ param.configuredValue }}</span>
                      <span 
                        v-if="param.defaultValue !== '-' && param.configuredValue !== '-' && param.defaultValue !== param.configuredValue"
                        class="inline-flex items-center rounded-md bg-pass-bg border border-pass-line px-1.5 py-0.5 text-[10.5px] font-semibold text-pass"
                      >
                        Override
                      </span>
                      <span 
                        v-else-if="param.defaultValue !== '-' && param.configuredValue === param.defaultValue"
                        class="inline-flex items-center rounded-md bg-surface-2 border border-line px-1.5 py-0.5 text-[10.5px] font-medium text-muted"
                      >
                        Default
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-[12px] text-muted align-middle">
                    {{ param.description }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="border-t border-line px-6 py-3.5 bg-surface flex justify-end">
          <button 
            @click="closeModal" 
            class="rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-sm hover:bg-surface-2 transition"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
