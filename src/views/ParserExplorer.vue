<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  FileJson, 
  Search, 
  Package, 
  Database,
  Box
} from 'lucide-vue-next';
import { apiService } from '../services/api';

const searchQuery = ref('');
const selectedArtifact = ref<string | null>(null);

const artifacts = ref<any[]>([]);
const mockParsedModel = ref<any>(null);

onMounted(async () => {
  artifacts.value = await apiService.getArtifacts();
  if (artifacts.value.length > 0) {
    selectedArtifact.value = artifacts.value[0].id;
    mockParsedModel.value = await apiService.getParsedModel(selectedArtifact.value!);
  }
});

// JSON Syntax Highlighting
const highlightJSON = (json: object) => {
  if (!json) return '';
  const jsonStr = JSON.stringify(json, null, 2);
  return jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
      let cls = 'text-blue-500'; // number
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'text-slate-700 font-semibold'; // key
        } else {
          cls = 'text-emerald-600'; // string
        }
      } else if (/true|false/.test(match)) {
        cls = 'text-orange-500'; // boolean
      } else if (/null/.test(match)) {
        cls = 'text-gray-500'; // null
      }
      return '<span class="' + cls + '">' + match + '</span>';
    });
};

</script>

<template>
  <div class="h-full flex flex-col">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-disp font-bold text-ink">파싱 모델 탐색기 (Parser Explorer)</h1>
        <p class="mt-1 text-sm text-muted">Parser가 아티팩트에서 추출한 구조화된 모델을 확인하고, 조건식 작성에 활용할 수 있습니다.</p>
      </div>
    </div>

    <div class="flex flex-1 gap-6 min-h-[700px]">
      <!-- Left Panel: Artifact List -->
      <div class="flex w-[320px] flex-col rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
        <div class="border-b border-line p-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="아티팩트 검색..." 
              class="w-full rounded-xl border border-line-2 bg-surface-2 py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-primary-400 focus:bg-surface focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2">
          <button 
            v-for="artifact in artifacts" 
            :key="artifact.id"
            @click="selectedArtifact = artifact.id"
            class="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-surface-2"
            :class="selectedArtifact === artifact.id ? 'bg-primary-tint border border-primary-200' : 'border border-transparent'"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface border border-line-2 shadow-sm"
                 :class="selectedArtifact === artifact.id ? 'text-primary-600 border-primary-200' : 'text-faint'">
              <Package class="h-5 w-5" />
            </div>
            <div class="flex-1 overflow-hidden">
              <div class="truncate font-disp text-sm font-semibold" :class="selectedArtifact === artifact.id ? 'text-primary-700' : 'text-ink'">
                {{ artifact.name }}
              </div>
              <div class="truncate text-xs text-muted">{{ artifact.package }}</div>
            </div>
          </button>
        </div>
      </div>

      <!-- Right Panel: Parsed Model Viewer -->
      <div class="flex flex-1 flex-col rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
        <div class="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-4">
          <div class="flex items-center gap-3">
            <FileJson class="h-5 w-5 text-primary-500" />
            <div>
              <div class="font-disp text-[15px] font-semibold text-ink">파싱 결과 JSON</div>
              <div class="text-[12px] text-muted">선택된 아티팩트의 추상화된 스키마입니다.</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-[12px] font-medium text-muted border border-line-2">
              <Database class="h-3.5 w-3.5" />
              스키마 버전: {{ mockParsedModel?.schemaVersion || '-' }}
            </div>
          </div>
        </div>
        
        <div class="relative flex-1 bg-[#FAFAFC] overflow-y-auto p-5 text-[13px] leading-relaxed font-mono">
          <pre 
            v-if="mockParsedModel" 
            class="whitespace-pre-wrap break-all" 
            v-html="highlightJSON(mockParsedModel)"
          ></pre>
          <div v-else class="flex h-full items-center justify-center text-muted flex-col gap-3">
            <Box class="h-10 w-10 text-line-2" />
            <div>선택된 아티팩트의 파싱 모델 데이터가 없습니다. (Mock 데이터 제한)</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 커스텀 스크롤바 */
pre::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
pre::-webkit-scrollbar-track {
  background: transparent;
}
pre::-webkit-scrollbar-thumb {
  background: #E2E4EB;
  border-radius: 4px;
}
pre::-webkit-scrollbar-thumb:hover {
  background: #C9CDD8;
}
</style>
