<script setup lang="ts">
import { ref } from 'vue';
import { Save, Plus } from 'lucide-vue-next';
import YamlPreview from '../components/YamlPreview.vue';

const scope = ref('global'); // 'global' | 'project'
const mode = ref('create'); // 'create' | 'edit'
const currentRuleId = ref('');
const severity = ref('fail'); // 'fail' | 'warn' | 'info'
const exprMode = ref('visual'); // 'visual' | 'text'

const ruleIdInput = ref('sender-naming');
const ruleType = ref('naming-convention');
const ruleMsg = ref('송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.');

const startCreate = (s: string) => {
  scope.value = s;
  mode.value = 'create';
  currentRuleId.value = '';
  ruleIdInput.value = '';
  ruleType.value = 'naming-convention';
  ruleMsg.value = '';
  severity.value = 'fail';
};

const editRule = (id: string, isGlobal: boolean) => {
  scope.value = isGlobal ? 'global' : 'project';
  mode.value = 'edit';
  currentRuleId.value = id;
  ruleIdInput.value = id;
  
  // 더미 데이터 로딩
  if (id === 'sender-naming') {
    ruleType.value = 'naming-convention';
    severity.value = 'fail';
    ruleMsg.value = '송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.';
  } else if (id === 'mapping-limit') {
    ruleType.value = 'custom-expression';
    severity.value = 'warn';
    ruleMsg.value = '매핑 스텝이 5개를 초과했습니다.';
  } else {
    ruleType.value = 'required-logging';
    severity.value = 'fail';
    ruleMsg.value = '처리 단계에 로깅 스텝이 없습니다.';
  }
};
</script>

<template>
  <div class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">규칙 관리</h1>
        <div class="mt-1 text-[13px] text-muted">전역 규칙과 프로젝트 규칙을 생성하거나 수정합니다</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Save class="h-[15px] w-[15px]" />
          규칙 저장
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_1fr]">
      <!-- 왼쪽 규칙 목록 -->
      <div class="flex flex-col gap-4">
        <div class="rounded-2xl border border-line bg-surface shadow-md">
          <div class="border-b border-line px-5 py-3.5">
            <h3 class="m-0 font-disp text-[14.5px] font-semibold">규칙 목록</h3>
          </div>
          <div class="p-4">
            <!-- 전역 규칙 -->
            <div class="mb-4">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[12px] font-semibold text-[#3B4257]">전역 규칙</span>
                <span class="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">라이브러리</span>
              </div>
              <div class="flex flex-col gap-1">
                <div 
                  @click="editRule('sender-naming', true)"
                  :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'sender-naming' && scope === 'global') ? 'bg-line-2' : 'bg-surface-2 hover:bg-line-2']"
                >
                  <span class="font-mono text-[12.5px] font-semibold text-primary-600">sender-naming</span>
                  <span class="rounded-sm bg-fail px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">FAIL</span>
                </div>
                <div 
                  @click="editRule('required-logging', true)"
                  :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'required-logging' && scope === 'global') ? 'bg-line-2' : 'hover:bg-surface-2']"
                >
                  <span class="font-mono text-[12.5px] font-semibold text-primary-600">required-logging</span>
                  <span class="rounded-sm bg-fail px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">FAIL</span>
                </div>
                <div 
                  @click="editRule('must-have-error', true)"
                  :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'must-have-error' && scope === 'global') ? 'bg-line-2' : 'hover:bg-surface-2']"
                >
                  <span class="font-mono text-[12.5px] font-semibold text-primary-600">must-have-error</span>
                  <span class="rounded-sm bg-warn px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">WARN</span>
                </div>
              </div>
              <button @click="startCreate('global')" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
                <Plus class="h-[14px] w-[14px]" /> 새 전역 규칙
              </button>
            </div>

            <!-- 프로젝트 규칙 -->
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[12px] font-semibold text-[#3B4257]">프로젝트 규칙</span>
                <span class="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-semibold text-primary-600">S-Oil IS 전환</span>
              </div>
              <div class="flex flex-col gap-1">
                <div 
                  @click="editRule('mapping-limit', false)"
                  :class="['flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 transition', (mode === 'edit' && currentRuleId === 'mapping-limit' && scope === 'project') ? 'bg-line-2' : 'hover:bg-surface-2']"
                >
                  <span class="font-mono text-[12.5px] font-semibold text-primary-600 truncate mr-2">mapping-limit</span>
                  <span class="shrink-0 rounded-sm bg-pass-bg border border-pass-line px-1.5 py-0.5 font-mono text-[10px] font-bold text-pass">조건식</span>
                </div>
              </div>
              <button @click="startCreate('project')" class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:bg-surface-2 hover:text-ink">
                <Plus class="h-[14px] w-[14px]" /> 새 프로젝트 규칙
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 오른쪽 폼 영역 -->
      <div class="grid grid-cols-2 gap-4">
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
                  <option value="custom-expression">custom-expression</option>
                  <option value="required-logging">required-logging</option>
                </select>
              </div>

              <div class="col-span-1 md:col-span-2">
                <label class="mb-2 block text-[12.5px] font-semibold text-[#3B4257]">심각도</label>
                <div class="flex gap-2">
                  <button @click="severity = 'fail'" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'fail' ? 'bg-fail text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-fail-bg hover:text-fail']">FAIL</button>
                  <button @click="severity = 'warn'" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'warn' ? 'bg-warn text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-warn-bg hover:text-warn']">WARN</button>
                  <button @click="severity = 'info'" :class="['rounded-[10px] px-5 py-2 font-mono text-[12.5px] font-semibold transition', severity === 'info' ? 'bg-primary text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-primary-tint hover:text-primary']">INFO</button>
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
                  <button @click="exprMode = 'visual'" :class="['flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition', exprMode === 'visual' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink']">비주얼 조건 빌더</button>
                  <button @click="exprMode = 'text'" :class="['flex-1 rounded-[8px] py-2 text-[13px] font-semibold transition', exprMode === 'text' ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink']">표현식 텍스트</button>
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

        <!-- YAML Preview 컴포넌트 -->
        <YamlPreview 
          :rule-id="ruleIdInput"
          :rule-type="ruleType"
          :severity="severity"
          :scope="scope"
          :message="ruleMsg"
        />
      </div>
    </div>
  </div>
</template>
