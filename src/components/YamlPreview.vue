
<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 'global' | 'project' */
  scope: { type: String, default: 'global' },
  /** 'new' | 'override' — scope가 'project'일 때만 의미를 가짐 */
  base: { type: String, default: 'new' },
  /** 프로젝트 규칙이 속한 프로젝트 키 */
  project: { type: String, default: 'soil-is-migration' },
  /** base가 'override'일 때, 재정의 대상이 되는 전역 규칙의 ruleKey */
  baseRuleKey: { type: String, default: '' },

  /** 규칙 식별 키 */
  ruleKey: { type: String, default: 'sender-naming' },
  /**
   * 규칙 타입 (카탈로그):
   * naming-convention | required-error-handler | externalized-endpoint |
   * allowed-adapter-types | required-logging | allowed-script-language |
   * forbidden-configuration | processdirect-pairing | custom-expression
   */
  ruleType: { type: String, default: 'naming-convention' },
  /** fail | warn | info */
  severity: { type: String, default: 'fail' },
  message: { type: String, default: '송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.' },

  /** naming-convention 파라미터 */
  target: { type: Object, default: () => ({ element: 'participant', role: 'sender' }) },
  prefixes: { type: Array, default: () => ['OP_', 'B2B_', 'CP_'] },

  /** custom-expression 파라미터 — 비주얼 빌더/텍스트 모드로 이미 해석된 최종 조건식 문자열 */
  expression: { type: String, default: 'steps.filter(s, s.type == "mapping").size() <= 5' },
  schemaVersion: { type: [String, Number], default: 1 },
})

/* ---------- syntax-highlight color tokens (원본 .code .k/.s/.c/.n/.p 와 동일) ---------- */
const K = 'text-[#93B7F5]'                 // key
const S = 'text-[#8FDCA6]'                 // string
const C = 'text-[#697291] italic'          // comment
const N = 'text-[#E6C578]'                 // number
const P = 'text-[#C9A6EC]'                 // type / severity / boolean

function esc(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
const span = (cls, v) => `<span class="${cls}">${esc(v)}</span>`
const key = (v) => span(K, v)
const strVal = (v) => span(S, v)          // 값 표시 (따옴표 없음)
const quoted = (v) => span(S, `"${esc(v)}"`) // 따옴표 있는 문자열 값
const typeVal = (v) => span(P, v)
const numVal = (v) => span(N, v)
const comment = (v) => span(C, v)

/* ---------- 규칙 타입별 파라미터 라인 (원본 paramLines()와 동일 규칙) ---------- */
function paramLines() {
  const type = props.ruleType

  if (type === 'naming-convention') {
    const el = props.target?.element ?? 'participant'
    const ro = props.target?.role ?? 'sender'
    const arr = (props.prefixes ?? []).map((p) => quoted(p)).join(', ')
    return [
      `  ${key('target')}: { ${key('element')}: ${strVal(el)}, ${key('role')}: ${strVal(ro)} }`,
      `  ${key('params')}:`,
      `    ${key('prefix')}: [${arr}]`,
    ]
  }
  if (type === 'externalized-endpoint') {
    return [`  ${key('target')}: { ${key('adapter')}: [${strVal('HTTP')}, ${strVal('SOAP')}, ${strVal('ODataV2')}] }`]
  }
  if (type === 'allowed-adapter-types') {
    return [
      `  ${key('params')}:`,
      `    ${key('allowed')}: [${strVal('HTTP')}, ${strVal('SOAP')}, ${strVal('ODataV2')}, ${strVal('SFTP')}]`,
    ]
  }
  if (type === 'allowed-script-language') {
    return [`  ${key('params')}:`, `    ${key('allowed')}: [${strVal('Groovy')}]`]
  }
  if (type === 'required-logging') {
    return [`  ${key('params')}:`, `    ${key('minSteps')}: ${numVal(1)}`]
  }
  if (type === 'forbidden-configuration') {
    return [
      `  ${key('params')}:`,
      `    ${key('allowedSystemCodes')}: [${strVal('SOIL_ERP')}, ${strVal('SOIL_MES')}]`,
    ]
  }
  if (type === 'custom-expression') {
    return [
      `  ${key('params')}:`,
      `    ${key('schemaVersion')}: ${numVal(props.schemaVersion)}`,
      `    ${key('expression')}: ${strVal(props.expression)}`,
    ]
  }
  return []
}

/* ---------- 파일명 (전역/프로젝트 경로가 다름) ---------- */
const yamlFileName = computed(() => {
  const id = props.ruleKey || 'rule-id'
  return props.scope === 'global'
    ? `rules/global/${id}.yaml`
    : `rules/project/${props.project}/${id}.yaml`
})

/* ---------- 전체 YAML 라인 구성 (원본 buildYaml()과 동일 규칙) ---------- */
const yamlLines = computed(() => {
  const id = props.ruleKey || 'rule-id'
  const type = props.ruleType
  const sev = props.severity
  const msg = props.message

  if (props.scope === 'global') {
    return [
      `${key('rule')}:`,
      `  ${key('ruleKey')}: ${strVal(id)}`,
      `  ${key('isGlobal')}: ${typeVal('true')}`,
      `  ${key('type')}: ${typeVal(type)}`,
      `  ${key('severity')}: ${typeVal(sev)}`,
      ...paramLines(),
      `  ${key('message')}: ${quoted(msg)}`,
    ]
  }

  // scope === 'project'
  const baseLine =
    props.base === 'override'
      ? `  ${key('overrides')}: ${typeVal('global:' + (props.baseRuleKey || id))}   ${comment('# 전역 규칙 재정의, ID·타입 유지')}`
      : `  ${key('type')}: ${typeVal(type)}   ${comment('# 전역에 없는 신규 규칙')}`

  return [
    `${key('rule')}:`,
    `  ${key('ruleKey')}: ${strVal(id)}`,
    `  ${key('isGlobal')}: ${typeVal('false')}`,
    `  ${key('customProject')}: ${strVal(props.project)}`,
    baseLine,
    `  ${key('severity')}: ${typeVal(sev)}`,
    ...paramLines(),
    `  ${key('message')}: ${quoted(msg)}`,
  ]
})

const yamlHtml = computed(() => yamlLines.value.join('\n'))
</script>

<template>
  <div class="rounded-2xl h-fit overflow-hidden bg-[#171B2E] shadow-[0_8px_40px_rgba(26,30,46,0.10)]">
    <!-- header -->
    <div class="flex items-center gap-[9px] px-4 py-[13px] border-b border-white/[0.07]">
      <span class="flex gap-[7px]">
        <i class="block w-[11px] h-[11px] rounded-full bg-[#E0605C]"></i>
        <i class="block w-[11px] h-[11px] rounded-full bg-[#E8C15A]"></i>
        <i class="block w-[11px] h-[11px] rounded-full bg-[#6FBE7A]"></i>
      </span>
      <span class="font-mono text-xs text-[#8B94AD] ml-[5px] truncate">{{ yamlFileName }}</span>
      <!-- <span class="ml-auto flex items-center gap-[6px] font-mono text-[11px] text-[#5FD69C] shrink-0">
        <span class="w-[6px] h-[6px] rounded-full bg-[#5FD69C] shadow-[0_0_0_3px_rgba(95,214,156,0.22)]"></span>
        live
      </span> -->
    </div>

    <!-- yaml body -->
    <pre
      class="m-0 p-[18px] font-mono text-[12.5px] leading-[1.75] text-[#D9DFEE] overflow-auto whitespace-pre [tab-size:2]"
      v-html="yamlHtml"
    ></pre>
  </div>
</template>
