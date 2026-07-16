import type { CheckRun, Finding, Tenant } from '../types';
import { MOCK_TENANTS, MOCK_CHECK_RUNS, MOCK_FINDINGS, MOCK_RULES } from './db';
import type { AppRule } from './db';

// 더미 데이터: 나중에 실제 API 통신 로직(fetch/axios)으로 대체됩니다.

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
  },

  // 규칙 정보 조회
  async getRules(): Promise<AppRule[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_RULES);
      }, 300);
    });
  },

  // 규칙 생성
  async createRule(rule: AppRule): Promise<{ status: number; data?: AppRule }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        MOCK_RULES.push(rule);
        resolve({ status: 201, data: rule });
      }, 300);
    });
  },

  // 규칙 수정
  async updateRule(id: string, rule: Partial<AppRule>): Promise<{ status: number; data?: AppRule }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = MOCK_RULES.findIndex(r => r.id === id);
        if (index !== -1) {
          MOCK_RULES[index] = { ...MOCK_RULES[index], ...rule };
          resolve({ status: 200, data: MOCK_RULES[index] });
        } else {
          resolve({ status: 404 });
        }
      }, 300);
    });
  }
};
