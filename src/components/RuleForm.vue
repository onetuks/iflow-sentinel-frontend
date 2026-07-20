<script setup lang="ts">

const scope = defineModel<string>('scope', { required: true });
const mode = defineModel<string>('mode', { required: true });
const ruleIdInput = defineModel<string>('ruleIdInput', { required: true });
const ruleType = defineModel<string>('ruleType', { required: true });
const severity = defineModel<string>('severity', { required: true });
const ruleMsg = defineModel<string>('ruleMsg', { required: true });
const exprMode = defineModel<string>('exprMode', { required: true });

const setSeverity = (val: string) => severity.value = val;
const setExprMode = (val: string) => exprMode.value = val;

import { ref, provide, nextTick, onMounted, watch } from 'vue';
import ConditionNode, { type ConditionGroup, type ConditionItem, type ActiveFieldKey } from './ConditionNode.vue';
import FieldPicker, { type FieldPickerArtifact } from './FieldPicker.vue';
import { getExpressionSchema, type SchemaField, type SubjectField } from '../utils/schemaTree';
import { apiService } from '../services/api';

const rootGroup = ref<ConditionGroup>({
  type: 'group',
  logic: 'AND',
  children: [
    { type: 'condition', subject: 'steps', filter: 'type == "mapping"', method: 'size()', operator: '<=', value: '5' }
  ]
});

// 파서 탐색기(ParserExplorer)와 동일한 API로 아티팩트/파싱 모델을 가져와 선택 가능한 필드 트리를 구성한다.
const fieldPickerArtifacts = ref<FieldPickerArtifact[]>([]);
const selectedFieldArtifactId = ref('');
const fieldTree = ref<SchemaField[]>([]);
const subjectFields = ref<SubjectField[]>([]);
const fieldSchemaLoading = ref(false);

const loadFieldSchema = async (artifactId: string) => {
  fieldSchemaLoading.value = true;
  try {
    const model = await apiService.getParsedModel(artifactId);
    const schema = getExpressionSchema(model);
    fieldTree.value = schema.tree;
    subjectFields.value = schema.subjects;
  } finally {
    fieldSchemaLoading.value = false;
  }
};

watch(selectedFieldArtifactId, (id) => {
  if (id) loadFieldSchema(id);
});

// 표현식 텍스트 모드
const expressionText = ref('steps.filter(s, s.type == "mapping").size() <= 5');
const exprTextarea = ref<HTMLTextAreaElement | null>(null);
const textCursorPos = ref<number | null>(null);
const trackTextCursor = () => {
  textCursorPos.value = exprTextarea.value?.selectionStart ?? null;
};
const insertIntoExpressionText = (token: string) => {
  const text = expressionText.value;
  const pos = textCursorPos.value ?? text.length;
  expressionText.value = text.slice(0, pos) + token + text.slice(pos);
  const newPos = pos + token.length;
  nextTick(() => {
    exprTextarea.value?.focus();
    exprTextarea.value?.setSelectionRange(newPos, newPos);
    textCursorPos.value = newPos;
  });
};

// 비주얼 빌더 모드 — 필드 선택기에서 클릭한 필드를 어느 입력에 꽂을지 추적
const activeVisualField = ref<{ target: ConditionItem; key: ActiveFieldKey } | null>(null);
provide('registerActiveField', (target: ConditionItem, key: ActiveFieldKey) => {
  activeVisualField.value = { target, key };
});

onMounted(async () => {
  const firstCondition = rootGroup.value.children.find((c): c is ConditionItem => c.type === 'condition');
  if (firstCondition) activeVisualField.value = { target: firstCondition, key: 'filter' };

  fieldPickerArtifacts.value = await apiService.getArtifacts();
  if (fieldPickerArtifacts.value.length) {
    // watch(selectedFieldArtifactId)가 필드 스키마 로딩을 트리거한다.
    selectedFieldArtifactId.value = fieldPickerArtifacts.value[0].id;
  }
});

const varFor = (subjectPath: string) => subjectPath.charAt(0).toLowerCase();

// 배열 필드는 subject 경로를, 배열 내부 스칼라 필드는 반복 변수(s.type)를,
// 배열 밖 스칼라 필드는 전체 경로(artifact.name)를 삽입 텍스트로 사용한다.
const tokenForTextMode = (field: SchemaField) => {
  if (field.kind === 'array') return field.arraySubjectPath ?? field.fullPath;
  if (field.arraySubjectPath) return `${varFor(field.arraySubjectPath)}.${field.itemPath}`;
  return field.itemPath;
};

const handleFieldInsert = (field: SchemaField) => {
  if (exprMode.value === 'text') {
    insertIntoExpressionText(tokenForTextMode(field));
    return;
  }

  if (!activeVisualField.value) return;
  const { target, key } = activeVisualField.value;

  if (field.kind === 'array') {
    target.subject = field.arraySubjectPath ?? field.fullPath;
    return;
  }
  if (key === 'subject') return; // subject 칸에는 배열(컬렉션) 필드만 넣을 수 있음

  if (key === 'filter') {
    target.filter = target.filter ? `${target.filter} && ${field.itemPath}` : field.itemPath;
  } else {
    target.value = field.itemPath;
  }
};
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

        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <FieldPicker
            v-model:artifact-id="selectedFieldArtifactId"
            :fields="fieldTree"
            :artifacts="fieldPickerArtifacts"
            :loading="fieldSchemaLoading"
            @insert="handleFieldInsert"
          />

          <div class="min-w-0 flex-1">
            <div v-if="exprMode === 'visual'" class="animate-fade">
              <p class="mb-2 text-[11.5px] text-faint">왼쪽 필드 목록에서 클릭하면 방금 선택(포커스)한 조건의 filter/value 칸에 삽입됩니다. 배열 필드는 subject로 설정됩니다.</p>
              <ConditionNode :node="rootGroup" :is-root="true" :subjects="subjectFields" />
            </div>

            <div v-else class="animate-fade">
              <p class="mb-2 text-[11.5px] text-faint">왼쪽 필드 목록을 클릭하면 커서 위치에 경로가 삽입됩니다.</p>
              <textarea
                ref="exprTextarea"
                v-model="expressionText"
                @click="trackTextCursor"
                @keyup="trackTextCursor"
                @focus="trackTextCursor"
                rows="4"
                class="w-full resize-none rounded-[11px] border border-line-2 bg-surface-2 px-3 py-2.5 font-mono text-[12.5px] text-primary-600 focus:border-primary focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-primary/15"
              ></textarea>
            </div>
          </div>
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
