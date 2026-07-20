import type { CheckRun, Finding, Tenant, IFlow } from '../types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 't1', projectId: 'p1', name: 'S-Oil DEV', odataUrl: 'soil-dev.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '최근 09:14', packageCount: 22 },
  { id: 't2', projectId: 'p1', name: 'S-Oil QAS', odataUrl: 'soil-qas.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'error', lastChecked: '최근 13:20', packageCount: 22 },
  { id: 't3', projectId: 'p1', name: 'S-Oil PRD', odataUrl: 'soil-prd.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '3일 전', packageCount: 20 },
];

export const MOCK_CHECK_RUNS: CheckRun[] = [
  { id: 'cr1', projectId: 'p1', tenantName: 'S-Oil QAS', startedAt: '2026-07-13 13:20', status: 'COMPLETED', summary: { pass: 12, warn: 3, fail: 2 }, verdict: '보류 권고' },
  { id: 'cr2', projectId: 'p1', tenantName: 'S-Oil DEV', startedAt: '2026-07-13 09:14', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
  { id: 'cr3', projectId: 'p1', tenantName: 'S-Oil PRD', startedAt: '2026-07-10 16:02', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
];

export const MOCK_IFLOWS: IFlow[] = [
  { id: 'if1', name: 'MM0101_ERP_GUAS', protocol: 'HTTP', version: 'v3' },
  { id: 'if2', name: 'FI0003_GQMS_B2Bi', protocol: 'OData', version: 'v5' },
  { id: 'if3', name: 'SD0010_CRM_ERP', protocol: 'SOAP', version: 'v7' },
  { id: 'if4', name: 'HR0005_WD_SF', protocol: 'ProcessDirect', version: 'v2' },
];

export const MOCK_FINDINGS: Finding[] = [
  { id: 'f1', checkRunId: 'cr1', artifactId: 'a1', ruleKey: 'no-hardcoded-endpoint', severity: 'fail', location: 'QAS', message: '엔드포인트 외부화 필수', count: 8 },
  { id: 'f2', checkRunId: 'cr1', artifactId: 'a2', ruleKey: 'must-have-error-handler', severity: 'warn', location: 'QAS', message: '예외 처리 서브프로세스 필수', count: 5 },
  { id: 'f3', checkRunId: 'cr1', artifactId: 'a3', ruleKey: 'sender-naming', severity: 'fail', location: 'QAS', message: '송신 시스템 이름 규칙 위반', count: 4 },
  { id: 'f4', checkRunId: 'cr1', artifactId: 'a4', ruleKey: 'required-logging', severity: 'warn', location: 'QAS', message: '로깅 스텝 누락', count: 3 },
];

export interface AppRule {
  id: string;
  name: string;
  scope: '전역 규칙' | '프로젝트 규칙';
  scopeType: 'global' | 'project';
  description: string;
  enabled: boolean;
  statusText: string;
  statusClass: string;
  ruleType: string;
  severity: 'fail' | 'warn' | 'info';
  ruleMsg: string;
}

export const MOCK_RULES: AppRule[] = [
  {
    id: 'sender-naming',
    name: 'sender-naming',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '접두사에 SOIL_ 추가 · 전역 원본(OP_/B2B_/CP_)은 꺼짐',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'naming-convention',
    severity: 'fail',
    ruleMsg: '송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.'
  },
  {
    id: 'required-logging',
    name: 'required-logging',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '심각도 warn (전역 fail 대신 이 프로젝트 전용 값 사용)',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'required-logging',
    severity: 'warn',
    ruleMsg: '처리 단계에 로깅 스텝이 없습니다.'
  },
  {
    id: 'soil-system-code-whitelist',
    name: 'soil-system-code-whitelist',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '전역에 없음 · SOIL_ERP, SOIL_MES 시스템 코드만 허용',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-pass-line bg-pass-bg text-pass',
    ruleType: 'custom-expression',
    severity: 'info',
    ruleMsg: '허용되지 않은 시스템 코드입니다.'
  },
  {
    id: 'mapping-step-limit',
    name: 'mapping-step-limit',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '사용자 정의 조건식 · 매핑 스텝 5개 초과 시 warn',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-pass-line bg-pass-bg text-pass',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: '매핑 스텝이 5개를 초과했습니다.'
  },
  {
    id: 'allowed-script-language',
    name: 'allowed-script-language',
    scope: '전역 규칙',
    scopeType: 'global',
    description: 'Groovy만 허용 · fail',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'fail',
    ruleMsg: '허용되지 않은 스크립트 언어입니다.'
  },
  {
    id: 'no-hardcoded-endpoint',
    name: 'no-hardcoded-endpoint',
    scope: '전역 규칙',
    scopeType: 'global',
    description: '엔드포인트 외부화 필수 · fail',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'fail',
    ruleMsg: '엔드포인트 외부화가 필요합니다.'
  },
  {
    id: 'must-have-error-handler',
    name: 'must-have-error-handler',
    scope: '전역 규칙',
    scopeType: 'global',
    description: '예외 처리 서브프로세스 필수 · warn',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: '예외 처리 서브프로세스가 존재하지 않습니다.'
  },
  {
    id: 'processdirect-pairing',
    name: 'processdirect-pairing',
    scope: '전역 규칙',
    scopeType: 'global',
    description: 'PD 송·수신 짝 검증 · warn',
    enabled: false,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: 'ProcessDirect 짝이 맞지 않습니다.'
  }
];
