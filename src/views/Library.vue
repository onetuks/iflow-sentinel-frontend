<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Save } from 'lucide-vue-next';
import { apiService } from '../services/api';
import type { AppRule } from '../services/db';
// @ts-ignore
import YamlPreview from '../components/YamlPreview.vue';
import RuleList from '../components/RuleList.vue';
import RuleForm from '../components/RuleForm.vue';

const scope = ref('global'); // 'global' | 'project'
const mode = ref('create'); // 'create' | 'edit'
const currentRuleId = ref('');
const severity = ref('fail'); // 'fail' | 'warn' | 'info'
const exprMode = ref('visual'); // 'visual' | 'text'

const rules = ref<AppRule[]>([]);
const route = useRoute();

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
  
  // 더미 데이터 로딩 (이제 전체 rules 목록에서 찾음)
  const targetRule = rules.value.find(r => r.name === id);
  if (targetRule) {
    ruleType.value = targetRule.ruleType;
    severity.value = targetRule.severity;
    ruleMsg.value = targetRule.ruleMsg;
  } else {
    // 만약 없는 경우의 기본값 (혹은 생성 모드로 둔다면)
    ruleType.value = 'naming-convention';
    severity.value = 'fail';
    ruleMsg.value = '';
  }
};

const saveRule = async () => {
  const isGlobal = scope.value === 'global';
  const newRule: AppRule = {
    id: mode.value === 'create' ? ruleIdInput.value : currentRuleId.value,
    name: ruleIdInput.value,
    scope: isGlobal ? '전역 규칙' : '프로젝트 규칙',
    scopeType: scope.value as 'global' | 'project',
    description: ruleMsg.value,
    enabled: true,
    statusText: isGlobal ? '전역 규칙' : '프로젝트 규칙',
    statusClass: isGlobal ? 'border-line-2 bg-surface-2 text-muted' : 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: ruleType.value,
    severity: severity.value as 'fail' | 'warn' | 'info',
    ruleMsg: ruleMsg.value
  };

  if (mode.value === 'create') {
    const response = await apiService.createRule(newRule);
    if (response.status >= 200 && response.status < 300) {
      alert(`[API: createRule] '${newRule.name}' 규칙이 생성되었습니다.`);
      rules.value = await apiService.getRules();
      mode.value = 'edit';
      currentRuleId.value = newRule.name;
    } else {
      alert('규칙 생성에 실패했습니다.');
    }
  } else {
    const response = await apiService.updateRule(currentRuleId.value, newRule);
    if (response.status >= 200 && response.status < 300) {
      alert(`[API: updateRule] '${newRule.name}' 규칙이 수정되었습니다.`);
      rules.value = await apiService.getRules();
    } else {
      alert('규칙 수정에 실패했습니다.');
    }
  }
};

onMounted(async () => {
  rules.value = await apiService.getRules();
  
  if (route.query.editId) {
    const editId = route.query.editId as string;
    const isGlobal = route.query.scope === 'global';
    editRule(editId, isGlobal);
  }
});
</script>

<template>
  <div class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">규칙 관리</h1>
        <div class="mt-1 text-[13px] text-muted">전역 규칙과 프로젝트 규칙을 생성하거나 수정합니다</div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2">
        <button @click="saveRule" class="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <Save class="h-[15px] w-[15px]" />
          규칙 저장
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_1fr]">
      <!-- 왼쪽 규칙 목록 -->
      <div class="flex flex-col gap-4">
        <RuleList 
          :mode="mode" 
          :currentRuleId="currentRuleId" 
          :scope="scope"
          :rules="rules"
          @create="startCreate"
          @edit="editRule"
        />
      </div>

      <!-- 오른쪽 폼 영역 -->
      <div class="grid grid-cols-2 gap-4">
        <RuleForm 
          v-model:scope="scope"
          v-model:mode="mode"
          v-model:ruleIdInput="ruleIdInput"
          v-model:ruleType="ruleType"
          v-model:severity="severity"
          v-model:ruleMsg="ruleMsg"
          v-model:exprMode="exprMode"
        />

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
