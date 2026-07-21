import type { CheckRun, Finding, Tenant } from '../types';
import { MOCK_TENANTS, MOCK_CHECK_RUNS, MOCK_FINDINGS, MOCK_RULES, MOCK_IFLOWS, MOCK_ARTIFACTS, MOCK_PARSED_MODEL, MOCK_PROJECTS, MOCK_RUN_STEPS, MOCK_TRACKER_ARTIFACTS, MOCK_CONFIGURED_PARAMETERS } from './db';
import type { AppRule, TrackerArtifact } from './db';

export type { AppRule, TrackerArtifact };

// 더미 데이터: 나중에 실제 API 통신 로직(fetch/axios)으로 대체됩니다.

export const apiService = {
  // 프로젝트 목록 조회
  async getProjects(): Promise<any[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_PROJECTS), 300));
  },
  // 실행 단계 목록 조회
  async getRunSteps(): Promise<any[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_RUN_STEPS), 100));
  },
  // 테넌트 정보 조회
  async getTenants(projectId: string): Promise<Tenant[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_TENANTS.filter(t => t.projectId === projectId));
      }, 300); // 300ms 지연으로 API 통신 시뮬레이션
    });
  },

  // 테넌트 연결 테스트
  async testTenantConnection(tenant: Tenant): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'OAuth2 인증 성공 · 22 패키지 조회됨'
        });
      }, 900);
    });
  },

  // 검사 이력 목록 조회
  async getCheckRuns(projectId: string): Promise<CheckRun[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_CHECK_RUNS.filter(c => c.projectId === projectId));
      }, 300);
    });
  },

  // 단일 검사 이력 조회
  async getCheckRun(runId: string): Promise<CheckRun | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_CHECK_RUNS.find(c => c.id === runId));
      }, 200);
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

  // 전체 검사 결과 항목 조회
  async getFindings(): Promise<Finding[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_FINDINGS);
      }, 300);
    });
  },

  // iFlow 목록 조회
  async getIFlows(): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_IFLOWS);
      }, 300);
    });
  },

  // 아티팩트 목록 조회
  async getArtifacts(): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_ARTIFACTS);
      }, 300);
    });
  },

  // 아티팩트 트래커용 데이터 조회
  async getTrackerArtifacts(tenantName: string): Promise<TrackerArtifact[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 실제 백엔드에서는 tenantName에 맞는 데이터를 조회합니다.
        // 현재는 더미 데이터를 반환합니다.
        resolve(MOCK_TRACKER_ARTIFACTS);
      }, 300);
    });
  },

  // 파싱 모델 조회
  async getParsedModel(artifactId: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock data is static, so just return it
        resolve(MOCK_PARSED_MODEL);
      }, 300);
    });
  },

  // Configured Parameters 조회
  async getConfiguredParameters(tenantName: string, artifactId: string): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const tenantConfigs = MOCK_CONFIGURED_PARAMETERS[tenantName] || {};
        const params = tenantConfigs[artifactId] || [];
        resolve(params);
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
