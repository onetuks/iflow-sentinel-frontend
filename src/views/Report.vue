<script setup lang="ts">
import { FileText, Download, UploadCloud, AlertCircle } from 'lucide-vue-next';

const findings = [
  { severity: 'FAIL', rule: 'no-hardcoded-endpoint', iflow: 'SOIL_OrderIF', location: 'Receiver "SendToS4"', message: '엔드포인트 주소가 하드코딩되어 있습니다. 외부화 파라미터로 관리하세요.', isFail: true },
  { severity: 'FAIL', rule: 'sender-naming', iflow: 'SOIL_InvoiceOut', location: 'Sender "BillingLegacy"', message: '송신 시스템 이름이 OP_/B2B_/CP_ 접두사를 따르지 않습니다.', isFail: true },
  { severity: 'WARN', rule: 'must-have-error-handler', iflow: 'SOIL_OrderIF', location: '흐름 전체', message: '예외 처리 서브프로세스가 없습니다.', isFail: false },
  { severity: 'WARN', rule: 'required-logging', iflow: 'SOIL_MaterialMaster', location: 'Groovy "MapMat"', message: '처리 단계에 로깅 스텝이 없습니다.', isFail: false },
  { severity: 'WARN', rule: 'processdirect-pairing', iflow: 'SOIL_ShipmentStatus', location: 'Receiver PD "/ship/status"', message: '대응하는 Sender ProcessDirect 채널을 찾을 수 없습니다.', isFail: false },
];
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
      <div class="ml-auto flex shrink-0 gap-2">
        <button class="flex items-center gap-1.5 rounded-[11px] border border-line-2 bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 hover:shadow-md">
          <FileText class="h-[15px] w-[15px]" /> Excel
        </button>
        <button class="flex items-center gap-1.5 rounded-[11px] border border-line-2 bg-surface px-3.5 py-2.5 text-[12.5px] font-semibold text-ink shadow-sm transition hover:border-[#D0D5E1] hover:bg-surface-2 hover:shadow-md">
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
              <span class="font-disp text-2xl font-bold text-pass leading-none">12</span>
              <span class="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-muted">Pass</span>
            </div>
            <div class="flex flex-col">
              <span class="font-disp text-2xl font-bold text-warn leading-none">3</span>
              <span class="mt-1 text-[11.5px] font-semibold uppercase tracking-widest text-muted">Warn</span>
            </div>
            <div class="flex flex-col">
              <span class="font-disp text-2xl font-bold text-fail leading-none">2</span>
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
        <div class="ml-auto flex shrink-0 gap-2">
          <button class="rounded-lg border border-fail-line px-2.5 py-1 text-[11.5px] font-bold text-fail shadow-sm transition hover:bg-fail-bg">FAIL 2</button>
          <button class="rounded-lg border border-warn-line px-2.5 py-1 text-[11.5px] font-bold text-warn shadow-sm transition hover:bg-warn-bg">WARN 3</button>
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
