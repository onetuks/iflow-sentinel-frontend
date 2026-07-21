<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { apiService } from '../services/api';
import type { Tenant } from '../types';
import { Plus, Info, TestTube2 } from 'lucide-vue-next';

const tenants = ref<Tenant[]>([]);
const isLoading = ref(true);
const isTesting = ref(false);
const testResult = ref('');
const showForm = ref(false);
const formMode = ref<'create' | 'edit'>('create');
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
  tenants.value = await apiService.getTenants('p1');
  isLoading.value = false;
});

const handleTestConnection = async () => {
  isTesting.value = true;
  testResult.value = '?•ì¸ ì¤‘â€?;
  try {
    const result = await apiService.testTenantConnection(currentTenant.value as any);
    testResult.value = result.message;
  } catch (error) {
    testResult.value = '?°ê²° ?¤ë¥˜ ë°œìƒ';
  } finally {
    isTesting.value = false;
  }
};

const handleAddTenantClick = () => {
  formMode.value = 'create';
  currentTenant.value = {
    name: '',
    platformType: 'CLOUD_FOUNDRY',
    odataUrl: '',
    clientId: '',
    clientSecret: '',
    tokenUrl: ''
  };
  showForm.value = true;
  testResult.value = '';
};

const handleEditTenantClick = (tenant: Tenant) => {
  formMode.value = 'edit';
  currentTenant.value = {
    name: tenant.name,
    platformType: tenant.platformType,
    odataUrl: tenant.odataUrl,
    clientId: tenant.clientId,
    clientSecret: tenant.clientSecret,
    tokenUrl: tenant.tokenUrl
  };
  showForm.value = true;
  testResult.value = '';
};

const handleSaveTenant = () => {
  if (formMode.value === 'create') {
    tenants.value.push({
      id: `t_${Date.now()}`,
      projectId: 'p1',
      odataUrl: currentTenant.value.odataUrl,
      clientId: currentTenant.value.clientId,
      clientSecret: currentTenant.value.clientSecret,
      tokenUrl: currentTenant.value.tokenUrl,
      platformType: currentTenant.value.platformType as any,
      status: 'connected',
      name: currentTenant.value.name,
      packageCount: 0
    });
  } else if (formMode.value === 'edit') {
    tenants.value.filter(t => t.name === currentTenant.value.name).forEach(t => {
      t.name = currentTenant.value.name;
      t.platformType = currentTenant.value.platformType as any;
      t.odataUrl = currentTenant.value.odataUrl;
      t.clientId = currentTenant.value.clientId;
      t.clientSecret = currentTenant.value.clientSecret;
      t.tokenUrl = currentTenant.value.tokenUrl;
    });
  }
  showForm.value = false;
};

const handleCancel = () => {
  showForm.value = false;
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
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">?œë“œ?¤ì??´í”„</h1>
        <div class="mt-1 text-[13px] text-muted">???„ë¡œ?íŠ¸ ?„ìš© ?Œë„Œ??ê´€ë¦?/div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button @click="handleAddTenantClick" class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Plus class="h-[15px] w-[15px]" />
          ?Œë„Œ??ì¶”ê?
        </button>
      </div>
    </div>

    <!-- ?•ë³´ ?ˆë‚´ ?¸íŠ¸ -->
    <div class="mb-5 flex gap-3 rounded-xl border border-[#E1E5FD] bg-primary-tint-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-[#42496B]">
      <Info class="mt-0.5 h-[17px] w-[17px] shrink-0 text-primary" />
      <span>?Œë„Œ?¸ëŠ” <b>???„ë¡œ?íŠ¸??ì¢…ì†</b>?˜ë©° ?¤ë¥¸ ?„ë¡œ?íŠ¸?€ ê³µìœ ?˜ì? ?ŠìŠµ?ˆë‹¤. ê°??Œë„Œ?¸ëŠ” ë³„ë„ OData ?”ë“œ?¬ì¸?¸ì? ?ê²©ì¦ëª…??ê°–ìŠµ?ˆë‹¤.</span>
    </div>

    <!-- ?Œë„Œ???”ì•½ ì¹´ë“œ ëª©ë¡ -->
    <div class="mb-5 grid grid-cols-1 gap-4.5 md:grid-cols-3">
      <div v-for="tenant in tenants" :key="tenant.id" class="rounded-2xl border border-line bg-surface p-4.5 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" @click="handleEditTenantClick(tenant)"">
        <div class="mb-3.5 flex items-center gap-2">
          <span :class="['rounded-md px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide', getBadgeClass(tenant)]">
            {{ tenant.name }}
          </span>
          <span class="ml-auto flex items-center gap-1.5 text-[11px] text-muted">
            <i :class="['h-2 w-2 rounded-full shadow-[0_0_0_3px]', tenant.status === 'connected' ? 'bg-pass shadow-pass-bg' : 'bg-fail shadow-fail-bg']"></i>
            {{ tenant.status === 'connected' ? '?•ìƒ' : '?¤ë¥˜' }}
          </span>
        </div>
        <div class="truncate font-mono text-[11.5px] text-muted">{{ tenant.odataUrl }}</div>
        <div class="mt-2.5 font-mono text-[11.5px] text-muted">CF Â· {{ tenant.packageCount }} ?¨í‚¤ì§€</div>
      </div>
    </div>

    <!-- ???ì—­ (QAS ?ˆì‹œ) -->
    <div v-if="showForm" class="rounded-2xl border border-line bg-surface shadow-md">
      <div class="flex items-center gap-2.5 border-b border-line px-5 py-4">
        <h3 class="m-0 font-disp text-[14.5px] font-semibold">{{ formMode === 'create' ? '?Œë„Œ???±ë¡' : '?Œë„Œ???¸ì§‘' }}</h3>
        <span class="text-xs font-medium text-faint">{{ currentTenant.name || '???Œë„Œ?? }}</span>
      </div>
      <div class="p-5">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">?Œë„Œ???´ë¦„</label>
            <input type="text" v-model="currentTenant.name" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="?? S-Oil PRD" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">? í˜•</label>
            <select class="w-full appearance-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-sans text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;">
              <option>Cloud Foundry</option>
              <option>Edge Integration Cell</option>
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
            <input type="text" v-model="currentTenant.clientId" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="Client ID ?…ë ¥" />
          </div>
          <div class="mb-4">
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Client Secret</label>
            <input type="password" v-model="currentTenant.clientSecret" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="?¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€? />
          </div>
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">Token URL</label>
          <input type="text" v-model="currentTenant.tokenUrl" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="https://..." />
          <div class="mt-1.5 text-[11.5px] text-faint">Client Credentials Â· ?ê²©ì¦ëª…?€ ?”í˜¸???€?¥ë©?ˆë‹¤.</div>
        </div>

        <!-- ?¡ì…˜ ë²„íŠ¼ ë°??ŒìŠ¤??ê²°ê³¼ ?¬ë¡¯ -->
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
            ?°ê²° ?ŒìŠ¤??
          </button>
          <div class="flex-1"></div>
          <button @click="handleCancel" class="flex items-center gap-1.5 rounded-[11px] bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-line-2 hover:text-ink">
            ì·¨ì†Œ
          </button>
          <button @click="handleSaveTenant" class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
            ?Œë„Œ???€??
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
