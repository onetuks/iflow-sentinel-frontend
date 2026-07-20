<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Sliders } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { Tenant } from '../types';
import type { TrackerArtifact } from '../services/api';

const tenants = ref<Tenant[]>([]);
const activeTenant = ref('');
const allArtifacts = ref<TrackerArtifact[]>([]);

const selectedPackage = ref('');
const selectedArtifact = ref('');
const parameters = ref<any[]>([]);

const availablePackages = computed(() => {
  const pkgs = new Set(allArtifacts.value.map(a => a.package));
  return Array.from(pkgs);
});

const availableArtifacts = computed(() => {
  return allArtifacts.value.filter(a => a.package === selectedPackage.value);
});

onMounted(async () => {
  const projectId = 'p1';
  tenants.value = await apiService.getTenants(projectId);
  if (tenants.value.length > 0) {
    activeTenant.value = tenants.value[0].tenantName;
    await fetchArtifacts();
  }
});

const fetchArtifacts = async () => {
  allArtifacts.value = await apiService.getTrackerArtifacts(activeTenant.value);
  if (availablePackages.value.length > 0) {
    selectedPackage.value = availablePackages.value[0];
  } else {
    selectedPackage.value = '';
  }
};

watch(activeTenant, fetchArtifacts);

watch(selectedPackage, () => {
  if (availableArtifacts.value.length > 0) {
    selectedArtifact.value = availableArtifacts.value[0].id;
  } else {
    selectedArtifact.value = '';
  }
});

watch(selectedArtifact, async (newVal) => {
  if (newVal) {
    const model = await apiService.getParsedModel(newVal);
    if (model && model.parameters) {
      parameters.value = model.parameters.map((p: any) => ({
        name: p.name,
        defaultValue: p.value || '-',
        configuredValue: p.value === '/api/v1/sender' ? '/api/prd/sender' : p.value || '-',
        description: p.isRequired === 'true' ? '필수 파라미터 (Required)' : '선택 파라미터 (Optional)'
      }));
    } else {
      parameters.value = [];
    }
  } else {
    parameters.value = [];
  }
});
</script>

<template>
  <div class="animate-fade flex flex-col h-[calc(100vh-2rem)]">
    <!-- Header -->
    <div class="mb-6 shrink-0">
      <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">프로퍼티 추적</h1>
      <div class="mt-1 text-[13px] text-muted">선택한 아티팩트에 선언된 External Parameter 목록을 조회합니다.</div>
    </div>
    
    <!-- Selection Filters -->
    <div class="mb-5 flex flex-wrap gap-4 shrink-0 bg-surface border border-line rounded-2xl p-5 shadow-sm">
      <div class="flex-1 min-w-[200px]">
        <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">테넌트</label>
        <select 
          v-model="activeTenant" 
          class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        >
          <option v-for="t in tenants" :key="t.id" :value="t.tenantName">{{ t.tenantName }}</option>
        </select>
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">패키지</label>
        <select 
          v-model="selectedPackage" 
          class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        >
          <option v-for="pkg in availablePackages" :key="pkg" :value="pkg">{{ pkg }}</option>
        </select>
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="mb-1.5 block text-[12.5px] font-semibold text-ink">아티팩트</label>
        <select 
          v-model="selectedArtifact" 
          class="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-[13px] text-ink focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
        >
          <option v-for="a in availableArtifacts" :key="a.id" :value="a.id">{{ a.artifact }}</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="flex flex-col flex-1 rounded-2xl border border-line bg-surface shadow-md overflow-hidden min-h-0">
      <div class="flex items-center gap-2 border-b border-line px-5 py-3 shrink-0 bg-white">
        <Sliders class="h-[18px] w-[18px] text-primary" />
        <h2 class="text-[14px] font-bold text-ink">External Parameters</h2>
        <span class="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
          {{ parameters.length }}
        </span>
      </div>
      
      <div class="flex-1 overflow-auto bg-white">
        <table class="w-full border-collapse min-w-[700px]">
          <thead class="sticky top-0 bg-surface z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <tr>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Name</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Default Value</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Configured Value</th>
              <th class="border-b border-line px-4.5 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wide text-faint w-1/4">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="parameters.length === 0">
              <td colspan="4" class="py-16 text-center text-[13px] text-muted">
                선택된 아티팩트에 외부 파라미터가 없습니다.
              </td>
            </tr>
            <tr 
              v-for="(param, index) in parameters" 
              :key="index" 
              class="transition hover:bg-surface-2 group border-b border-line/50 last:border-b-0"
            >
              <td class="px-4.5 py-3.5 align-middle font-mono text-[12.5px] font-medium text-ink w-1/4">
                {{ param.name }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-[12.5px] text-ink break-all w-1/4">
                {{ param.defaultValue }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-[12.5px] text-primary-700 font-medium break-all w-1/4">
                {{ param.configuredValue }}
              </td>
              <td class="px-4.5 py-3.5 align-middle text-[12.5px] text-muted w-1/4">
                {{ param.description }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
