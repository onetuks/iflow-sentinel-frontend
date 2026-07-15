<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  ruleId: string;
  ruleType: string;
  severity: string;
  scope: string;
  message: string;
}>();

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const yamlHtml = computed(() => {
  const id = props.ruleId || 'new-rule';
  const type = props.ruleType;
  const msg = props.message;
  const sev = props.severity;
  
  let lines: string[] = [];
  
  if (props.scope === 'global') {
    lines = [
      `<span class="k">rule</span>:`,
      `  <span class="k">ruleKey</span>: <span class="s">${id}</span>`,
      `  <span class="k">isGlobal</span>: <span class="p">true</span>`,
      `  <span class="k">type</span>: <span class="p">${type}</span>`,
      `  <span class="k">severity</span>: <span class="p">${sev}</span>`
    ];
    
    if (type === 'custom-expression') {
      lines.push(
        `  <span class="k">params</span>:`,
        `    <span class="k">schemaVersion</span>: <span class="n">1</span>`,
        `    <span class="k">expression</span>: <span class="s">${escapeHtml('steps.filter(s, s.type == "mapping").size() <= 5')}</span>`
      );
    } else if (type === 'naming-convention') {
      lines.push(
        `  <span class="k">target</span>: { <span class="k">element</span>: <span class="s">participant</span>, <span class="k">role</span>: <span class="s">sender</span> }`,
        `  <span class="k">params</span>:`,
        `    <span class="k">prefix</span>: [<span class="s">"OP_"</span>, <span class="s">"B2B_"</span>, <span class="s">"CP_"</span>]`
      );
    } else if (type === 'required-logging') {
      lines.push(
        `  <span class="k">params</span>:`,
        `    <span class="k">minSteps</span>: <span class="n">1</span>`
      );
    }
    
    lines.push(`  <span class="k">message</span>: <span class="s">"${escapeHtml(msg)}"</span>`);
  } else {
    lines = [
      `<span class="k">rule</span>:`,
      `  <span class="k">ruleKey</span>: <span class="s">${id}</span>`,
      `  <span class="k">isGlobal</span>: <span class="p">false</span>`,
      `  <span class="k">customProject</span>: <span class="s">soil-is-migration</span>`,
      `  <span class="k">type</span>: <span class="p">${type}</span>   <span class="c"># 전역에 없는 신규 규칙</span>`,
      `  <span class="k">severity</span>: <span class="p">${sev}</span>`
    ];
    
    if (type === 'custom-expression') {
      lines.push(
        `  <span class="k">params</span>:`,
        `    <span class="k">schemaVersion</span>: <span class="n">1</span>`,
        `    <span class="k">expression</span>: <span class="s">${escapeHtml('steps.filter(s, s.type == "mapping").size() <= 5')}</span>`
      );
    } else if (type === 'naming-convention') {
      lines.push(
        `  <span class="k">target</span>: { <span class="k">element</span>: <span class="s">participant</span>, <span class="k">role</span>: <span class="s">sender</span> }`,
        `  <span class="k">params</span>:`,
        `    <span class="k">prefix</span>: [<span class="s">"OP_"</span>, <span class="s">"B2B_"</span>, <span class="s">"CP_"</span>]`
      );
    } else if (type === 'required-logging') {
      lines.push(
        `  <span class="k">params</span>:`,
        `    <span class="k">minSteps</span>: <span class="n">1</span>`
      );
    }
    
    lines.push(`  <span class="k">message</span>: <span class="s">"${escapeHtml(msg)}"</span>`);
  }
  
  return lines.join('\n');
});

const fileName = computed(() => {
  const id = props.ruleId || 'new-rule';
  return props.scope === 'global' ? `rules/global/${id}.yaml` : `rules/project/soil-is-migration/${id}.yaml`;
});
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-xl bg-[#1E1E1E] shadow-[0_8px_40px_rgba(26,30,46,0.1)] h-full min-h-[300px]">
    <div class="flex items-center border-b border-[#404040] bg-[#2D2D2D] px-3.5 py-3">
      <div class="mr-3.5 flex gap-1.5">
        <i class="inline-block h-[11px] w-[11px] rounded-full bg-[#E0605C]"></i>
        <i class="inline-block h-[11px] w-[11px] rounded-full bg-[#E8C15A]"></i>
        <i class="inline-block h-[11px] w-[11px] rounded-full bg-[#6FBE7A]"></i>
      </div>
      <span class="mr-auto font-mono text-[12.5px] tracking-wide text-[#D4D4D4]">{{ fileName }}</span>
      <span class="rounded-xl border border-[rgba(14,159,110,0.3)] bg-[rgba(14,159,110,0.15)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#0E9F6E]">live</span>
    </div>
    <div class="flex-1 overflow-auto p-4">
      <pre class="yaml-code m-0 font-mono text-[12.5px] leading-relaxed" v-html="yamlHtml"></pre>
    </div>
  </div>
</template>

<style scoped>
.yaml-code {
  color: #CE9178;
}
:deep(.yaml-code .k) { color: #569CD6; }
:deep(.yaml-code .s) { color: #CE9178; }
:deep(.yaml-code .v) { color: #B5CEA8; }
:deep(.yaml-code .p) { color: #569CD6; }
:deep(.yaml-code .n) { color: #B5CEA8; }
:deep(.yaml-code .c) { color: #6A9955; }
</style>
