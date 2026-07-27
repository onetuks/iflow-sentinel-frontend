import type { CheckRun, Finding, Tenant, IFlow, AppRule, TrackerArtifact, Project } from '../types';
export type { AppRule, TrackerArtifact } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  console.log(API_BASE);
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

  return response.json();
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
    return fetchApi<Tenant[]>(url);
  },
  async testTenantConnection(tenant: Tenant): Promise<{ success: boolean; message: string }> {
    return fetchApi<any>(`/tenants/${tenant.id}/test-connection`, { method: "POST" });
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
  async getTrackerArtifacts(_tenantName: string): Promise<TrackerArtifact[]> {
    return [];
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
  async createRule(rule: AppRule): Promise<{ status: number; data?: AppRule }> {
    const payload = {
      ruleKey: rule.name,
      isGlobal: rule.scopeType === 'global',
      customProjectId: rule.scopeType === 'project' ? 1 : null,
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
