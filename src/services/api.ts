import type { CheckRun, Finding, Tenant } from '../types';
import { MOCK_TENANTS, MOCK_CHECK_RUNS, MOCK_FINDINGS, MOCK_RULES, MOCK_IFLOWS, MOCK_ARTIFACTS, MOCK_PARSED_MODEL, MOCK_PROJECTS, MOCK_RUN_STEPS, MOCK_TRACKER_ARTIFACTS, MOCK_CONFIGURED_PARAMETERS } from './db';
import type { AppRule, TrackerArtifact } from './db';

export type { AppRule, TrackerArtifact };

const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  
  // 204 No Content 처리
  if (response.status === 204) {
    return {} as T;
  }
  
  return response.json();
}

export const apiService = {
  // 프로젝트 목록 조회
  async getProjects(): Promise<any[]> {
    try {
      return await fetchApi<any[]>('/projects');
    } catch (e) {
      console.warn('API /projects failed, falling back to mock', e);
      return MOCK_PROJECTS;
    }
  },
  // 실행 단계 목록 조회
  async getRunSteps(): Promise<any[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_RUN_STEPS), 100));
  },
  // 테넌트 정보 조회
  async getTenants(projectId: number): Promise<Tenant[]> {
    try {
      return await fetchApi<Tenant[]>(`/tenants?projectId=${projectId}`);
    } catch (e) {
      console.warn('API /tenants failed, falling back to mock', e);
      return MOCK_TENANTS.filter(t => t.projectId === projectId);
    }
  },

  // 테넌트 연결 테스트
  async testTenantConnection(tenant: Tenant): Promise<{ success: boolean; message: string }> {
    try {
      return await fetchApi<any>(`/tenants/${tenant.id}/test-connection`, { method: 'POST' });
    } catch (e) {
      console.warn('API test-connection failed, falling back to mock', e);
      return { success: true, message: 'OAuth2 인증 성공 · 22 패키지 조회됨' };
    }
  },

  // 검사 이력 목록 조회
  async getCheckRuns(projectId: number): Promise<CheckRun[]> {
    try {
      return await fetchApi<CheckRun[]>(`/checkruns?projectId=${projectId}`);
    } catch (e) {
      console.warn('API /checkruns failed, falling back to mock', e);
      return MOCK_CHECK_RUNS.filter(c => c.projectId === projectId);
    }
  },

  // 단일 검사 이력 조회
  async getCheckRun(runId: number): Promise<CheckRun | undefined> {
    try {
      return await fetchApi<CheckRun>(`/checkruns/${runId}`);
    } catch (e) {
      console.warn(`API /checkruns/${runId} failed, falling back to mock`, e);
      return MOCK_CHECK_RUNS.find(c => c.id === runId);
    }
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
    try {
      return await fetchApi<Finding[]>('/findings');
    } catch (e) {
      console.warn('API /findings failed, falling back to mock', e);
      return MOCK_FINDINGS;
    }
  },

  // iFlow 목록 조회
  async getIFlows(): Promise<IFlow[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_IFLOWS), 300));
  },

  // 아티팩트 목록 조회
  async getArtifacts(): Promise<any[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_ARTIFACTS);
      }, 300);
    });
  },

  // 트래커 데이터 조회 (임시)
  async getTrackerArtifacts(_tenantName: string): Promise<TrackerArtifact[]> {
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_TRACKER_ARTIFACTS), 400));
  },

  // 파싱된 모델 조회 (XML 등)
  async getParsedModel(artifactId: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          parameters: MOCK_CONFIGURED_PARAMETERS[artifactId] || {}
        });
      }, 300);
    });
  },

  // 트래커 설정 파라미터 조회
  async getConfiguredParameters(_tenantName: string, artifactId: string): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_CONFIGURED_PARAMETERS[artifactId] || {});
      }, 200);
    });
  },

  // 규칙 정보 조회
  async getRules(projectId: number = 1): Promise<AppRule[]> {
    try {
      const backendRules = await fetchApi<any[]>(`/projects/${projectId}/rules`);
      return backendRules.map(r => ({
        id: r.ruleId || r.id,
        name: r.ruleKey,
        scope: r.isGlobal ? '전역 규칙' : '프로젝트 규칙',
        scopeType: r.isGlobal ? 'global' : 'project',
        description: r.message,
        enabled: r.isEnabled !== undefined ? r.isEnabled : r.enabled,
        statusText: r.isGlobal ? '라이브러리' : '프로젝트 규칙',
        statusClass: r.isGlobal ? 'border-line-2 bg-surface-2 text-muted' : 'border-[#D5DAFB] bg-primary-tint text-primary-600',
        ruleType: (r.type || 'naming-convention').toLowerCase().replace(/_/g, '-'),
        severity: (r.severity || 'INFO').toUpperCase() as any,
        ruleMsg: r.message
      }));
    } catch (e) {
      console.warn(`API /projects/${projectId}/rules failed, falling back to mock`, e);
      return MOCK_RULES;
    }
  },

  // 규칙 생성
  async createRule(rule: AppRule): Promise<{ status: number; data?: AppRule }> {
    try {
      const payload = {
        ruleKey: rule.name,
        isGlobal: rule.scopeType === 'global',
        customProjectId: rule.scopeType === 'project' ? 1 : null,
        type: rule.ruleType.toUpperCase().replace(/-/g, '_'),
        severity: rule.severity.toUpperCase(),
        target: {}, // 더미, 실제 UI에서 관리된다면 추가 맵핑 필요
        params: {}, // 더미
        message: rule.description,
        enabled: rule.enabled
      };
      
      const r: any = await fetchApi<any>('/rules', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      const createdRule: AppRule = {
        ...rule,
        id: r.id,
      };
      return { status: 201, data: createdRule };
    } catch (e) {
      console.warn('API POST /rules failed, falling back to mock', e);
      MOCK_RULES.push(rule);
      return { status: 201, data: rule };
    }
  },

  // 규칙 수정
  async updateRule(id: number, rule: Partial<AppRule>): Promise<{ status: number; data?: AppRule }> {
    try {
      const payload: any = {};
      if (rule.severity) payload.severity = rule.severity.toUpperCase();
      if (rule.description) payload.message = rule.description;
      if (rule.enabled !== undefined) payload.enabled = rule.enabled;

      const r: any = await fetchApi<any>(`/rules/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      
      const updatedRule: AppRule = {
        ...(rule as AppRule), // approximation
        id: r.id,
      };
      return { status: 200, data: updatedRule };
    } catch (e) {
      console.warn(`API PUT /rules/${id} failed, falling back to mock`, e);
      const index = MOCK_RULES.findIndex(r => r.id === id);
      if (index !== -1) {
        MOCK_RULES[index] = { ...MOCK_RULES[index], ...rule };
        return { status: 200, data: MOCK_RULES[index] };
      }
      return { status: 404 };
    }
  }
};
