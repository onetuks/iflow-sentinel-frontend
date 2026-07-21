<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FileText, Download, UploadCloud, AlertCircle } from 'lucide-vue-next';
import { apiService } from '../services/api';

const findings = ref<any[]>([]);

const passCount = ref(0);
const warnCount = ref(0);
const failCount = ref(0);

onMounted(async () => {
  // 실제 API 호출 시뮬레이션
  const [findingsResult, mockIflows, checkRun] = await Promise.all([
    apiService.getFindings(),
    apiService.getIFlows(),
    apiService.getCheckRun(1)
  ]);

  if (checkRun) {
    passCount.value = checkRun.summary.pass;
    warnCount.value = checkRun.summary.warn;
    failCount.value = checkRun.summary.fail;
  }

  findings.value = findingsResult.map(f => {
    // artifactId(예: 1)를 iflow id(예: if1)로 매핑하여 이름 찾기
    const iflowId = `if${f.artifactId}`;
    const iflow = mockIflows.find(i => i.id === iflowId);
    
    return {
      severity: f.severity.toUpperCase(),
      rule: f.ruleKey,
      iflow: iflow ? iflow.name : String(f.artifactId),
      location: f.location,
      message: f.message,
      isFail: f.severity.toUpperCase() === 'FAIL'
    };
  }).sort((a, b) => {
    const severityOrder: Record<string, number> = { 'FAIL': 0, 'WARN': 1, 'INFO': 2 };
    // 1. 심각도 순 (FAIL -> WARN -> INFO)
    const aSev = severityOrder[a.severity] ?? 99;
    const bSev = severityOrder[b.severity] ?? 99;
    
    if (aSev !== bSev) return aSev - bSev;
    // 2. iFlow 이름 순
    return a.iflow.localeCompare(b.iflow);
  });
});

const downloadExcel = () => {
  if (findings.value.length === 0) return;
  
  const headers = ['심각도', '규칙', 'iFlow', '위치', '메시지'];
  const csvRows = [headers.join(',')];
  
  findings.value.forEach(f => {
    const row = [
      f.severity,
      f.rule,
      f.iflow,
      `"${f.location}"`, // 쉼표 포함 방지
      `"${f.message}"`
    ];
    csvRows.push(row.join(','));
  });
  
  // 엑셀에서 한글이 깨지지 않도록 BOM 추가
  const csvString = "\uFEFF" + csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `검사_리포트_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadPDF = () => {
  window.print();
};
</script>

<template>
  <div class="animate-fade">
    <div class="mb-6 flex min-h-[44px] flex-wrap items-center gap-3.5">
      <div>
        <h1 class="m-0 font-disp text-2xl font-bold tracking-tight">검사 리포트</h1>
        <div class="mt-1 text-[13px] text-muted">
          S-Oil IS 전환 · <span class="font-mono font-semibold">QAS</span> · 2026-07-13 13:20 · <span class="font-mono">inspien-base + soil-strict</span>
        </div>
      </div>
      <div class="ml-auto flex shrink-0 gap-2 print:hidden">
        <button @click="downloadExcel" class="flex items-center gap-1.5 rounded-[11px] border border-line-2 bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 hover:shadow-md">
          <FileText class="h-[15px] w-[15px]" /> Excel
        </button>
        <button @click="downloadPDF" class="flex items-center gap-1.5 rounded-[11px] border border-line-2 bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 hover:shadow-md">
          <Download class="h-[15px] w-[15px]" /> PDF
        </button>
        <button class="flex items-center gap-1.5 rounded-[11px] bg-gradient-to-br from-[#5666F2] to-[#4C5DF0] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(76,93,240,0.32)] transition hover:shadow-[0_6px_20px_rgba(76,93,240,0.42)]">
          <UploadCloud class="h-[15px] w-[15px]" /> 이관 티켓 첨부
        </button>
      </div>
    </div>

    <!-- 게이트웨이 결과 표시 -->
    <div class="mb-5 overflow-hidden rounded-2xl border border-fail-line bg-surface shadow-lg">
      <div class="flex flex-col md:flex-row items-stretch">
        <div class="flex w-full flex-col items-center justify-center bg-fail-bg p-6 md:w-[220px] md:border-r md:border-fail-line">
          <AlertCircle class="mb-2 h-10 w-10 text-fail" />
          <div class="font-disp text-xl font-bold tracking-tight text-fail">보류 권고</div>
        </div>
        <div class="flex-1 p-6">
          <h2 class="m-0 mb-2 font-disp text-lg font-bold text-ink">필수 규칙 위반 2건이 발견되어 이관 보류를 권고합니다</h2>
          <p class="m-0 text-[13.5px] leading-relaxed text-muted">
            iFlow Sentinel은 이관을 자동으로 막지 않습니다 — FAIL 항목을 검토한 뒤 이관 여부는 담당자가 결정하세요. WARN은 참고용입니다.
          </p>
          <div class="mt-5 flex gap-6">
            <div class="flex flex-col">
              <span class="font-disp text-2xl font-bold text-pass leading-none">{{ passCount }}</span>
              <span class="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-muted">Pass</span>
            </div>
            <div class="flex flex-col">
              <span class="font-disp text-2xl font-bold text-warn leading-none">{{ warnCount }}</span>
              <span class="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-muted">Warn</span>
            </div>
            <div class="flex flex-col">
              <span class="font-disp text-2xl font-bold text-fail leading-none">{{ failCount }}</span>
              <span class="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-muted">Fail</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 상세 위반 리스트 -->
    <div class="rounded-2xl border border-line bg-surface shadow-md">
      <div class="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <h3 class="m-0 font-disp text-[14.5px] font-semibold">위반 상세</h3>
        <span class="text-[12.5px] font-medium text-faint">Findings · 5</span>
        <div class="ml-auto flex shrink-0 gap-2 print:hidden">
          <button class="rounded-lg border border-fail-line px-2.5 py-1 text-[11.5px] font-bold text-fail shadow-sm transition hover:bg-fail-bg">FAIL {{ failCount }}</button>
          <button class="rounded-lg border border-warn-line px-2.5 py-1 text-[11.5px] font-bold text-warn shadow-sm transition hover:bg-warn-bg">WARN {{ warnCount }}</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th class="border-b border-line px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint w-[80px]">심각도</th>
              <th class="border-b border-line px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">규칙</th>
              <th class="border-b border-line px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">iFlow</th>
              <th class="border-b border-line px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">위치</th>
              <th class="border-b border-line px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-faint">메시지</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(f, idx) in findings" :key="idx" class="transition hover:bg-surface-2">
              <td class="border-b border-line px-5 py-3.5 align-middle">
                <span :class="[
                  'rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold',
                  f.isFail ? 'bg-fail text-white' : 'bg-warn text-white'
                ]">
                  {{ f.severity }}
                </span>
              </td>
              <td class="border-b border-line px-5 py-3.5 align-middle font-mono text-[12.5px] font-semibold text-primary-600">{{ f.rule }}</td>
              <td class="border-b border-line px-5 py-3.5 align-middle font-mono text-[12.5px] text-ink">{{ f.iflow }}</td>
              <td class="border-b border-line px-5 py-3.5 align-middle font-mono text-[11.5px] text-muted">{{ f.location }}</td>
              <td class="border-b border-line px-5 py-3.5 align-middle text-[13px] text-ink">{{ f.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
