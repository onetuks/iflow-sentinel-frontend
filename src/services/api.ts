import type { CheckRun, Finding, Tenant, IFlow, AppRule, TrackerArtifact, Project, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry } from '../types';
export type { AppRule, TrackerArtifact, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text || !text.trim()) {
    return {} as T;
  }

  return JSON.parse(text);
}

export const apiService = {
  async getProjects(): Promise<Project[]> {
    return fetchApi<Project[]>('/projects');
  },
  async createProject(name: string): Promise<{ status: number; data?: Project }> {
    const r: any = await fetchApi<any>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    return { status: 201, data: r };
  },
  async updateProject(id: number, name: string): Promise<{ status: number; data?: Project }> {
    const r: any = await fetchApi<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
    return { status: 200, data: r };
  },
  async deleteProject(id: number): Promise<{ status: number }> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
    return { status: response.status };
  },
  async getRunSteps(): Promise<any[]> {
    return [];
  },
  async getTenants(projectId?: number): Promise<Tenant[]> {
    const url = projectId ? `/tenants?projectId=${projectId}` : '/tenants';
    console.log("url: ", url);
    const tenants = await fetchApi<Tenant[]>(url);
    return tenants.map(t => ({
      ...t,
      status: t.status || 'connected',
      packageCount: t.packageCount ?? 0
    }));
  },
  async createTenant(tenant: Partial<Tenant>): Promise<{ status: number; data?: Tenant }> {
    const response = await fetch(`${API_BASE}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  },
  async updateTenant(id: number, tenant: Partial<Tenant>): Promise<{ status: number; data?: Tenant }> {
    const response = await fetch(`${API_BASE}/tenants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenant)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  },
  async deleteTenant(id: number): Promise<{ status: number }> {
    const response = await fetch(`${API_BASE}/tenants/${id}`, {
      method: 'DELETE'
    });
    return { status: response.status };
  },
  async syncTenant(id: number): Promise<{ status: number }> {
    const response = await fetch(`${API_BASE}/tenants/${id}/sync`, {
      method: 'POST'
    });
    return { status: response.status };
  },
  async testTenantConnection(tenant: Partial<Tenant>): Promise<{ success: boolean; message: string }> {
    if (tenant.id) {
      return fetchApi<any>(`/tenants/${tenant.id}/test-connection`, { method: 'POST' });
    }
    return fetchApi<any>('/tenants/test-connection', {
      method: 'POST',
      body: JSON.stringify(tenant)
    });
  },
  async getPackages(tenantId: number): Promise<any[]> {
    return fetchApi<any[]>(`/tenants/${tenantId}/packages`);
  },
  async getCheckRuns(projectId: number): Promise<CheckRun[]> {
    return fetchApi<CheckRun[]>(`/checkruns?projectId=${projectId}`);
  },
  async getCheckRun(runId: number): Promise<CheckRun | undefined> {
    return fetchApi<CheckRun>(`/checkruns/${runId}`);
  },
  async getTopFindings(): Promise<Finding[]> {
    const findings = await fetchApi<Finding[]>('/findings');
    return findings.slice(0, 5);
  },
  async getFindings(): Promise<Finding[]> {
    return fetchApi<Finding[]>('/findings');
  },
  async getIFlows(): Promise<IFlow[]> {
    return [];
  },
  async getArtifacts(packageId: number): Promise<IFlow[]> {
    return fetchApi<IFlow[]>(`/packages/${packageId}/artifacts`);
  },
  async getTrackerArtifacts(tenantId: number | string): Promise<TrackerArtifact[]> {
    if (!tenantId) return [];
    try {
      const data = await fetchApi<any[]>(`/tenants/${tenantId}/tracker-artifacts`);
      return data.map((item, idx) => {
        let statusDisplay: 'Deployed' | 'Undeployed' | 'Illusion' = 'Undeployed';
        const st = (item.status || '').toUpperCase();
        if (st === 'DEPLOYED') statusDisplay = 'Deployed';
        else if (st === 'ILLUSION') statusDisplay = 'Illusion';
        else statusDisplay = 'Undeployed';

        const sapId = item.artifactId || String(idx + 1);

        return {
          id: sapId,
          artifactId: sapId,
          package: item.packageName || item.packageId || '-',
          artifact: item.artifactName || item.artifactId || '-',
          runtime: item.version || item.runtimeStatus || '-',
          status: statusDisplay
        };
      });
    } catch (e) {
      console.error('Failed to fetch tracker artifacts:', e);
      return [];
    }
  },
  async deployTrackerArtifact(tenantId: number | string, artifactId: string): Promise<void> {
    await fetchApi<void>(`/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}/deploy`, {
      method: 'POST'
    });
  },
  async undeployTrackerArtifact(tenantId: number | string, artifactId: string): Promise<void> {
    await fetchApi<void>(`/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}/undeploy`, {
      method: 'POST'
    });
  },
  async deleteTrackerArtifact(tenantId: number | string, artifactId: string, version: string = '1.0.0'): Promise<void> {
    await fetchApi<void>(`/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}?version=${encodeURIComponent(version)}`, {
      method: 'DELETE'
    });
  },
  async getParsedModel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/parser/test`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json();
  },
  async getConfiguredParameters(_tenantName: string, _artifactId: string): Promise<any> {
    return {};
  },
  // 메시지 재처리: Data Store 큐에서 Message ID로 엔트리(Body 포함)를 조회한다.
  // TODO: 백엔드 Data Store 조회 API 연동 전까지는 스텁으로 항상 '찾을 수 없음'을 반환한다.
  async lookupDataStoreEntry(_tenantId: number, _artifactId: number, _messageId: string): Promise<DataStoreEntryLookupResult> {
    return { found: false, notFoundReason: '백엔드 Data Store 연동이 아직 준비되지 않았습니다.' };
  },
  // 메시지 재처리: 조회된 Body를 아티팩트의 엔드포인트로 직접 호출(재전송)한다.
  async executeReprocess(_payload: { tenantId: number; artifactId: number; messageId: string }): Promise<ReprocessExecutionResult> {
    return { success: false, message: '백엔드 재처리 실행 API가 아직 준비되지 않았습니다.' };
  },
  // 메시지 재처리 이력 목록 조회
  async getReprocessHistory(_tenantId?: number): Promise<ReprocessHistoryEntry[]> {
    return [];
  },
  async getRules(projectId: number = 1): Promise<AppRule[]> {
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
  },
  async createRule(rule: AppRule, projectId?: number): Promise<{ status: number; data?: AppRule }> {
    const payload = {
      ruleKey: rule.name,
      isGlobal: rule.scopeType === 'global',
      customProjectId: rule.scopeType === 'project' ? projectId : null,
      type: rule.ruleType.toUpperCase().replace(/-/g, '_'),
      severity: rule.severity.toUpperCase(),
      target: {},
      params: {},
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
  },
  async updateRule(id: number, rule: Partial<AppRule>): Promise<{ status: number; data?: AppRule }> {
    const payload: any = {};
    if (rule.severity) payload.severity = rule.severity.toUpperCase();
    if (rule.description) payload.message = rule.description;
    if (rule.enabled !== undefined) payload.enabled = rule.enabled;
    const r: any = await fetchApi<any>(`/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    const updatedRule: AppRule = {
      ...(rule as AppRule),
      id: r.id,
    };
    return { status: 200, data: updatedRule };
  }
};
