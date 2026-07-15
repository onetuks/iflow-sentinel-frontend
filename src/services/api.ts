import type { CheckRun, Finding, Tenant } from '../types';

// 더미 데이터: 나중에 실제 API 통신 로직(fetch/axios)으로 대체됩니다.

const MOCK_TENANTS: Tenant[] = [
  { id: 't1', projectId: 'p1', name: 'DEV', environment: 'DEV', odataUrl: 'soil-dev.integrationsuite.cfapps...', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '최근 09:14', packageCount: 22 },
  { id: 't2', projectId: 'p1', name: 'QAS', environment: 'QAS', odataUrl: 'soil-qas.integrationsuite.cfapps...', platformType: 'CLOUD_FOUNDRY', status: 'error', lastChecked: '최근 13:20', packageCount: 22 },
  { id: 't3', projectId: 'p1', name: 'PRD', environment: 'PRD', odataUrl: 'soil-prd.integrationsuite.cfapps...', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '3일 전', packageCount: 20 },
];

const MOCK_CHECK_RUNS: CheckRun[] = [
  { id: 'cr1', projectId: 'p1', environment: 'QAS', startedAt: '2026-07-13 13:20', status: 'COMPLETED', summary: { pass: 12, warn: 3, fail: 2 }, verdict: '보류 권고' },
  { id: 'cr2', projectId: 'p1', environment: 'DEV', startedAt: '2026-07-13 09:14', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
  { id: 'cr3', projectId: 'p1', environment: 'PRD', startedAt: '2026-07-10 16:02', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
];

const MOCK_FINDINGS: Finding[] = [
  { id: 'f1', checkRunId: 'cr1', artifactId: 'a1', ruleKey: 'no-hardcoded-endpoint', severity: 'fail', location: 'QAS', message: '엔드포인트 외부화 필수', count: 8 },
  { id: 'f2', checkRunId: 'cr1', artifactId: 'a2', ruleKey: 'must-have-error-handler', severity: 'warn', location: 'QAS', message: '예외 처리 서브프로세스 필수', count: 5 },
  { id: 'f3', checkRunId: 'cr1', artifactId: 'a3', ruleKey: 'sender-naming', severity: 'fail', location: 'QAS', message: '송신 시스템 이름 규칙 위반', count: 4 },
  { id: 'f4', checkRunId: 'cr1', artifactId: 'a4', ruleKey: 'required-logging', severity: 'warn', location: 'QAS', message: '로깅 스텝 누락', count: 3 },
];

export const apiService = {
  // 테넌트 정보 조회
  async getTenants(projectId: string): Promise<Tenant[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_TENANTS.filter(t => t.projectId === projectId));
      }, 300); // 300ms 지연으로 API 통신 시뮬레이션
    });
  },

  // 검사 이력 조회
  async getCheckRuns(projectId: string): Promise<CheckRun[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_CHECK_RUNS.filter(c => c.projectId === projectId));
      }, 300);
    });
  },

  // 최다 위반 항목 조회
  async getTopFindings(): Promise<Finding[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_FINDINGS);
      }, 300);
    });
  }
};
