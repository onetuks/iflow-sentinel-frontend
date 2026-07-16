<script setup lang="ts">
import { Plus } from 'lucide-vue-next';

const scope = defineModel<string>('scope', { required: true });
const mode = defineModel<string>('mode', { required: true });
const ruleIdInput = defineModel<string>('ruleIdInput', { required: true });
const ruleType = defineModel<string>('ruleType', { required: true });
const severity = defineModel<string>('severity', { required: true });
const ruleMsg = defineModel<string>('ruleMsg', { required: true });
const exprMode = defineModel<string>('exprMode', { required: true });

const setSeverity = (val: string) => severity.value = val;
const setExprMode = (val: string) => exprMode.value = val;
</script>

<template>
  <div class="rounded-2xl border border-line bg-surface shadow-md">
    <div class="flex items-center gap-2 border-b border-line px-5 py-4">
      <h3 class="m-0 font-disp text-[14.5px] font-semibold">
        {{ mode === 'create' ? '새 규칙 작성' : '규칙 수정' }}
      </h3>
      <span :class="[
        'rounded-full px-2 py-0.5 text-[10.5px] font-semibold',
        scope === 'global' ? 'bg-surface-2 border border-line-2 text-muted' : 'bg-primary-tint text-primary-600'
      ]">
        {{ scope === 'global' ? '전역 규칙' : '프로젝트 규칙' }}
      </span>
    </div>
    
    <div class="p-5">
      <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">규칙 ID</label>
          <input type="text" v-model="ruleIdInput" :disabled="mode === 'edit'" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:bg-surface-2 disabled:text-muted" placeholder="규칙 ID 입력" />
        </div>

        <div>
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">규칙 타입</label>
          <select v-model="ruleType" class="w-full appearance-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[12.5px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236C7385\' stroke-width=\'2.2\'><path d=\'M6 9l6 6 6-6\'/></svg>'); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;">
            <option value="naming-convention">naming-convention</option>
            <option value="required-error-handler">required-error-handler</option>
            <option value="externalized-endpoint">externalized-endpoint</option>
            <option value="allowed-adapter-types">allowed-adapter-types</option>
            <option value="required-logging">required-logging</option>
            <option value="allowed-script-language">allowed-script-language</option>
            <option value="mapping-type">mapping-type</option>
            <option value="required-parameter">required-parameter</option>
            <option value="forbidden-configuration">forbidden-configuration</option>
            <option value="processdirect-pairing">processdirect-pairing</option>
            <option value="custom-expression">custom-expression</option>
          </select>
        </div>

        <div class="col-span-1 md:col-span-2">
          <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">심각도</label>
          <div class="flex gap-2">
            <button @click="setSeverity('fail')" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'fail' ? 'bg-fail text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-fail-bg hover:text-fail']">FAIL</button>
            <button @click="setSeverity('warn')" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'warn' ? 'bg-warn text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-warn-bg hover:text-warn']">WARN</button>
            <button @click="setSeverity('info')" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'info' ? 'bg-primary text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-primary-tint hover:text-primary']">INFO</button>
          </div>
        </div>

        <div class="col-span-1 md:col-span-2">
          <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">안내 메시지</label>
          <textarea rows="2" v-model="ruleMsg" class="w-full resize-none rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink transition focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15" placeholder="위반 시 출력할 메시지"></textarea>
        </div>
      </div>

      <!-- 파라미터(조건식 빌더 등) -->
      <div class="mt-6 border-t border-line-2 border-dashed pt-5" v-if="ruleType === 'custom-expression'">
        <div class="mb-4 text-[11.5px] font-semibold uppercase tracking-widest text-faint">파라미터 (표현식)</div>
        
        <div class="mb-4">
          <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">입력 방식</label>
          <div class="flex w-full overflow-hidden rounded-[11px] border border-line-2 bg-surface-2 p-1">
            <button @click="setExprMode('visual')" :class="['flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition', exprMode === 'visual' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink']">비주얼 조건 빌더</button>
            <button @click="setExprMode('text')" :class="['flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition', exprMode === 'text' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink']">표현식 텍스트</button>
          </div>
        </div>

        <div v-if="exprMode === 'visual'" class="animate-fade rounded-xl border border-line bg-surface-2 p-4">
          <div class="flex flex-wrap items-center gap-2">
            <select class="rounded-lg border border-line px-2 py-1.5 font-mono text-[12px]"><option>steps</option></select>
            <select class="rounded-lg border border-line px-2 py-1.5 font-mono text-[12px]"><option>type == "mapping"</option></select>
            <select class="rounded-lg border border-line px-2 py-1.5 font-mono text-[12px]"><option>size()</option></select>
            <select class="rounded-lg border border-line px-2 py-1.5 font-mono text-[12px]"><option><=</option></select>
            <input type="text" value="5" class="w-16 rounded-lg border border-line px-2 py-1.5 font-mono text-[12px] text-center" />
          </div>
          
          <!-- 조건 추가 버튼 추가됨 -->
          <button class="mt-3 flex items-center gap-1.5 rounded-lg border border-line-2 bg-white px-3 py-1.5 text-[11px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
            <Plus class="h-[12px] w-[12px]" /> 조건 추가
          </button>
          
          <div class="mt-3 border-t border-line-2 pt-3 text-[11px] font-semibold text-faint">AND / OR 묶음은 조건을 추가하면 여기 표시됩니다</div>
        </div>
        
        <div v-else class="animate-fade">
          <textarea rows="3" class="w-full resize-none rounded-[11px] border border-line-2 bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] text-primary-600 focus:border-primary focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-primary/15">steps.filter(s, s.type == "mapping").size() <= 5</textarea>
        </div>
      </div>
      
      <div class="mt-6 border-t border-line-2 border-dashed pt-5" v-if="ruleType === 'naming-convention'">
        <div class="mb-4 text-[11.5px] font-semibold uppercase tracking-widest text-faint">파라미터 (네이밍 컨벤션)</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">대상 요소</label>
            <select class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 text-[13px] text-ink"><option>participant</option></select>
          </div>
          <div>
            <label class="mb-1.5 block text-[12.5px] font-semibold text-[#3B4257]">허용 접두사</label>
            <input type="text" value="OP_, B2B_, CP_" class="w-full rounded-[11px] border border-line-2 bg-surface px-3 py-2.5 font-mono text-[13px] text-ink" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
