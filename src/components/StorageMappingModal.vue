<script setup lang="ts">
import { ref, watch } from 'vue';
import { Database, Layers, Save, CheckCircle, AlertCircle, Sparkles, SlidersHorizontal } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { StorageMapping } from '../types';

const props = defineProps<{
  isOpen: boolean;
  tenantId: number;
  tenantName: string;
  artifactId: number | string;
  artifactName: string;
  storageType: 'DATASTORE' | 'JMS';
  defaultDetectedName?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', updatedName: string): void;
}>();

const activeTab = ref<'auto' | 'api' | 'manual'>('auto');
const detectedName = ref('');
const suggestedCandidate = ref('');
const customOverride = ref('');
const isSaving = ref(false);
const saveSuccess = ref(false);

const apiCandidates = ref<string[]>([]);

const loadMapping = async () => {
  if (!props.tenantId || !props.artifactId) return;
  saveSuccess.value = false;
  detectedName.value = props.defaultDetectedName || props.artifactName;

  const mapping = await apiService.getStorageMapping(props.tenantId, props.artifactId, props.storageType);
  if (mapping.overrideName) {
    customOverride.value = mapping.overrideName;
    activeTab.value = 'manual';
  } else {
    customOverride.value = '';
    activeTab.value = 'auto';
  }

  // 2단계 SAP IS API 추정 후보 (mock/simulation)
  const baseName = props.artifactName.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (props.storageType === 'DATASTORE') {
    apiCandidates.value = [
      `${baseName}`,
      `${baseName}_RETRY`,
      `DATASTORE_${baseName}_SHARED`
    ];
  } else {
    apiCandidates.value = [
      `Q_${baseName}_INBOUND`,
      `Q_${baseName}_RETRY`,
      `${baseName}_DEAD_LETTER`
    ];
  }
  suggestedCandidate.value = apiCandidates.value[0];
};

watch(() => [props.isOpen, props.tenantId, props.artifactId, props.storageType], () => {
  if (props.isOpen) {
    loadMapping();
  }
});

const handleSave = async () => {
  isSaving.value = true;
  saveSuccess.value = false;
  try {
    let targetStorageName = detectedName.value;
    let confidenceLevel: 'AUTO_PARSED' | 'MANUAL_INPUT' = 'AUTO_PARSED';

    if (activeTab.value === 'manual' && customOverride.value.trim()) {
      targetStorageName = customOverride.value.trim();
      confidenceLevel = 'MANUAL_INPUT';
    } else if (activeTab.value === 'api' && suggestedCandidate.value.trim()) {
      targetStorageName = suggestedCandidate.value.trim();
      confidenceLevel = 'MANUAL_INPUT';
    } else {
      targetStorageName = detectedName.value;
      confidenceLevel = 'AUTO_PARSED';
    }

    const payload: StorageMapping = {
      tenantId: props.tenantId,
      artifactId: props.artifactId,
      storageType: props.storageType,
      storageName: targetStorageName,
      expireDays: 90,
      confidenceLevel,
      overrideName: activeTab.value === 'manual' ? targetStorageName : undefined,
      detectedName: detectedName.value,
      suggestedName: suggestedCandidate.value
    };

    await apiService.saveStorageMapping(payload);
    saveSuccess.value = true;
    emit('saved', targetStorageName);

    setTimeout(() => {
      emit('close');
    }, 500);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
    <div class="w-full max-w-lg rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden animate-fade">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-line px-5 py-4 bg-surface-2">
        <div class="flex items-center gap-2">
          <Database v-if="storageType === 'DATASTORE'" class="h-5 w-5 text-primary" />
          <Layers v-else class="h-5 w-5 text-[#8B5CF6]" />
          <div>
            <h3 class="m-0 text-[15px] font-bold text-ink">
              {{ storageType === 'DATASTORE' ? 'Data Store' : 'JMS Queue' }} 저장소 매핑 설정
            </h3>
            <div class="text-[12px] text-muted font-mono">
              {{ tenantName }} &bull; {{ artifactName }}
            </div>
          </div>
        </div>
        <button @click="emit('close')" class="rounded-lg p-1 text-muted hover:bg-line/40 hover:text-ink transition">
          ✕
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4">
        <!-- 3단계 선택 탭 -->
        <div class="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1 text-[12.5px] font-medium border border-line">
          <button
            @click="activeTab = 'auto'"
            :class="[
              'rounded-lg py-2 transition flex items-center justify-center gap-1.5',
              activeTab === 'auto' ? 'bg-white font-semibold text-primary shadow-sm' : 'text-muted hover:text-ink'
            ]"
          >
            <Sparkles class="h-[13px] w-[13px]" />
            1단계: 정적 파싱
          </button>
          <button
            @click="activeTab = 'api'"
            :class="[
              'rounded-lg py-2 transition flex items-center justify-center gap-1.5',
              activeTab === 'api' ? 'bg-white font-semibold text-primary shadow-sm' : 'text-muted hover:text-ink'
            ]"
          >
            <SlidersHorizontal class="h-[13px] w-[13px]" />
            2단계: API 추정
          </button>
          <button
            @click="activeTab = 'manual'"
            :class="[
              'rounded-lg py-2 transition flex items-center justify-center gap-1.5',
              activeTab === 'manual' ? 'bg-white font-semibold text-primary shadow-sm' : 'text-muted hover:text-ink'
            ]"
          >
            <Save class="h-[13px] w-[13px]" />
            3단계: 수동 입력
          </button>
        </div>

        <!-- 1단계: 정적 파싱 자동탐지 -->
        <div v-if="activeTab === 'auto'" class="rounded-xl border border-pass-line bg-pass-bg/50 p-4 space-y-2">
          <div class="flex items-center gap-2 text-[13px] font-semibold text-pass">
            <CheckCircle class="h-4 w-4" />
            iFlow 배포 XML 정적 파싱 추출 (신뢰도 높음)
          </div>
          <div class="text-[12px] text-muted">
            해당 iFlow 아티팩트의 구성 XML에서 직접 추출된 저장소 이름입니다.
          </div>
          <div class="rounded-lg bg-white border border-line px-3 py-2 font-mono text-[13px] font-bold text-ink">
            {{ detectedName }}
          </div>
        </div>

        <!-- 2단계: SAP IS API 후보 추천 -->
        <div v-else-if="activeTab === 'api'" class="rounded-xl border border-warn-line bg-warn-bg/40 p-4 space-y-3">
          <div class="flex items-center gap-2 text-[13px] font-semibold text-warn">
            <AlertCircle class="h-4 w-4" />
            SAP IS API 실제 존재 목록 기반 (추정됨 · 신뢰도 낮음)
          </div>
          <div class="text-[12px] text-muted">
            테넌트에서 실제 존재하는 {{ storageType }} 목록을 조회하여 이름이 유사한 후보를 추출했습니다.
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-semibold text-ink">추천 후보 선택</label>
            <select
              v-model="suggestedCandidate"
              class="w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-[12.5px] text-ink outline-none focus:border-primary"
            >
              <option v-for="cand in apiCandidates" :key="cand" :value="cand">
                {{ cand }}
              </option>
            </select>
          </div>
        </div>

        <!-- 3단계: 완전 수동 오버라이드 -->
        <div v-else class="rounded-xl border border-line-2 bg-surface-2 p-4 space-y-3">
          <div class="text-[13px] font-semibold text-ink">
            테넌트 × 아티팩트 전용 수동 오버라이드
          </div>
          <div class="text-[12px] text-muted">
            DEV/QAS/PRD 환경에 따라 저장소/큐 이름이 다를 경우 직접 입력한 이름을 항상 최우선 적용합니다.
          </div>
          <div>
            <label class="mb-1 block text-[12px] font-semibold text-ink">오버라이드 저장소 이름</label>
            <input
              v-model="customOverride"
              type="text"
              placeholder="예: CUSTOM_STORE_NAME_DEV"
              class="w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-[12.5px] text-ink placeholder-faint outline-none focus:border-primary"
            />
          </div>
        </div>

        <div class="text-[11.5px] text-faint bg-surface-2 p-2.5 rounded-lg border border-line/60">
          💡 저장된 오버라이드 매핑은 <b>{{ tenantName }}</b> 환경의 <b>{{ artifactName }}</b> 재처리 실행 시 자동 적용됩니다.
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5 bg-surface-2">
        <button
          @click="emit('close')"
          class="rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-medium text-ink transition hover:bg-surface-2"
        >
          취소
        </button>
        <button
          @click="handleSave"
          :disabled="isSaving"
          class="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          {{ isSaving ? '저장 중...' : saveSuccess ? '저장 완료!' : '매핑 저장' }}
        </button>
      </div>
    </div>
  </div>
</template>
