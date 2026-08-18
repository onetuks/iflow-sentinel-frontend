import type { CheckRun, Finding, Tenant, IFlow, AppRule, TrackerArtifact, Project, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry, MplFailureLog, StorageMapping, ReprocessSupportType } from '../types';
export type { AppRule, TrackerArtifact, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry, MplFailureLog, StorageMapping, ReprocessSupportType } from "../types";

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

// 테넌트 x 아티팩트 저장소 수동 매핑 인메모리 스토어 (프론트 데모 / 백엔드 연동 전)
const storageMappingStore = new Map<string, StorageMapping>();
const reprocessHistoryStore: ReprocessHistoryEntry[] = [];

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
        const nameUpper = (item.artifactName || item.artifactId || '').toUpperCase();

        // 파서 정규화 결과에 따른 재처리 지원 유형 추정 (mocking 및 백엔드 확장 준비)
        let reprocessType: ReprocessSupportType = 'DATASTORE_ONLY';
        let dataStoreName = item.dataStoreName || `DS_${nameUpper.replace(/[^A-Z0-9_]/g, '_')}`;
        let queueName = item.queueName || `Q_${nameUpper.replace(/[^A-Z0-9_]/g, '_')}`;
        let expireDays = item.expireDays || 90;

        if (nameUpper.includes('JMS') && nameUpper.includes('STORE')) {
          reprocessType = 'BOTH';
        } else if (nameUpper.includes('JMS') || nameUpper.includes('QUEUE')) {
          reprocessType = 'JMS_ONLY';
        } else if (nameUpper.includes('NO_STORE') || nameUpper.includes('DIRECT')) {
          reprocessType = 'NONE';
        }

        return {
          id: sapId,
          artifactId: sapId,
          package: item.packageName || item.packageId || '-',
          artifact: item.artifactName || item.artifactId || '-',
          runtime: item.version || item.runtimeStatus || '-',
          status: statusDisplay,
          endpointUrl: item.endpointUrl || `/cxf/http/${item.artifactName || sapId}`,
          reprocessType,
          dataStoreName,
          queueName,
          expireDays
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
  async exportArtifactsExcel(tenantId: number | string, artifactIds?: string[]): Promise<Blob> {
    let url = `${API_BASE}/tenants/${tenantId}/tracker-artifacts/export`;
    if (artifactIds && artifactIds.length > 0) {
      const query = artifactIds.map(id => `artifactIds=${encodeURIComponent(id)}`).join('&');
      url += `?${query}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Export failed with status: ${response.status}`);
    }
    return response.blob();
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
  async getConfiguredParameters(tenantId: number | string, artifactId: string, version?: string): Promise<any[]> {
    if (!tenantId || !artifactId) return [];
    try {
      let url = `/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}/configurations`;
      if (version) {
        url += `?version=${encodeURIComponent(version)}`;
      }
      const data = await fetchApi<any[]>(url);
      return (data || []).map(item => ({
        name: item.name,
        defaultValue: item.defaultValue || '-',
        configuredValue: item.configuredValue || '-',
        dataType: item.dataType || 'xsd:string'
      }));
    } catch (e) {
      console.error('Failed to fetch artifact configurations:', e);
      return [];
    }
  },

  // ── 메시지 재처리 관련 API 메서드 ────────────────────────────────

  /** 선택한 아티팩트의 최근 MPL 실패 로그 목록 조회 */
  async getMplFailureLogs(tenantId: number | string, artifactId: string | number): Promise<MplFailureLog[]> {
    try {
      return await fetchApi<MplFailureLog[]>(`/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}/mpl-failures`);
    } catch (e) {
      // Mock Fallback
      const now = new Date();
      const formatTime = (minusMinutes: number) => {
        const d = new Date(now.getTime() - minusMinutes * 60 * 1000);
        return d.toISOString().replace('T', ' ').substring(0, 19);
      };
      return [
        {
          messageId: `AGRl${Math.random().toString(36).substring(2, 12).toUpperCase()}4423AF68A`,
          correlationId: `CORR-20260818-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'FAILED',
          logStart: formatTime(25),
          logEnd: formatTime(24),
          errorDetail: 'HTTP 500 Internal Server Error: Receiver System Connection Refused',
          customHeader: 'SAP_SenderSystem: ERP_PRD, SAP_ReceiverSystem: CRM_PRD'
        },
        {
          messageId: `AGRl${Math.random().toString(36).substring(2, 12).toUpperCase()}8819CF12B`,
          correlationId: `CORR-20260818-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'ESCALATED',
          logStart: formatTime(110),
          logEnd: formatTime(108),
          errorDetail: 'DataStore Exception: Entry lock timeout or payload parsing error',
          customHeader: 'SAP_SenderSystem: MES_PRD, SAP_ReceiverSystem: SAP_IS'
        },
        {
          messageId: `AGRl${Math.random().toString(36).substring(2, 12).toUpperCase()}1120DE99C`,
          correlationId: `CORR-20260818-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'FAILED',
          logStart: formatTime(240),
          logEnd: formatTime(238),
          errorDetail: 'JMS Adapter Exception: Connection reset by peer during queue write',
          customHeader: 'SAP_SenderSystem: WMS_PRD, SAP_ReceiverSystem: SAP_IS'
        }
      ];
    }
  },

  /** 테넌트 x 아티팩트 저장소 매핑 오버라이드 조회 */
  async getStorageMapping(tenantId: number, artifactId: string | number, storageType: 'DATASTORE' | 'JMS'): Promise<StorageMapping> {
    const key = `${tenantId}_${artifactId}_${storageType}`;
    if (storageMappingStore.has(key)) {
      return storageMappingStore.get(key)!;
    }
    // 기본 파싱 추정값 반환
    const defaultName = storageType === 'DATASTORE' ? `DS_${artifactId}` : `Q_${artifactId}`;
    return {
      tenantId,
      artifactId,
      storageType,
      detectedName: defaultName,
      suggestedName: `${defaultName}_API_SUGGESTED`,
      confidence: 'HIGH'
    };
  },

  /** 테넌트 x 아티팩트 저장소 매핑 오버라이드 저장 */
  async saveStorageMapping(mapping: StorageMapping): Promise<StorageMapping> {
    const key = `${mapping.tenantId}_${mapping.artifactId}_${mapping.storageType}`;
    storageMappingStore.set(key, mapping);
    return mapping;
  },

  /** Data Store 또는 JMS Queue 메시지 ID로 엔트리(Body 포함) 조회 */
  async lookupDataStoreEntry(
    tenantId: number,
    artifactId: number | string,
    messageId: string,
    storageType: 'DATASTORE' | 'JMS' = 'DATASTORE'
  ): Promise<DataStoreEntryLookupResult> {
    try {
      return await fetchApi<DataStoreEntryLookupResult>(
        `/tenants/${tenantId}/tracker-artifacts/${encodeURIComponent(artifactId)}/reprocess-lookup?messageId=${encodeURIComponent(messageId)}&storageType=${storageType}`
      );
    } catch (e) {
      // Mock Fallback: 8자리 이상의 ID인 경우 성공으로 시뮬레이션
      if (messageId.trim().length >= 8) {
        const mapping = await this.getStorageMapping(tenantId, artifactId, storageType);
        const effectiveName = mapping.overrideName || mapping.detectedName;
        const storedDate = new Date(Date.now() - 2 * 24 * 3600 * 1000); // 2일 전 저장
        const expireDays = 90;
        const daysRemaining = 88;

        const sampleBody = storageType === 'DATASTORE'
          ? `<?xml version="1.0" encoding="UTF-8"?>
<n0:OrderRequest xmlns:n0="http://sap.com/iflow/sentinel/demo">
  <Header>
    <MessageId>${messageId}</MessageId>
    <Timestamp>${storedDate.toISOString()}</Timestamp>
    <Sender>ERP_SYSTEM</Sender>
  </Header>
  <Item>
    <MaterialId>MAT-99201</MaterialId>
    <Quantity>150</Quantity>
    <UnitPrice>45000</UnitPrice>
    <Currency>KRW</Currency>
  </Item>
</n0:OrderRequest>`
          : `{\n  "messageId": "${messageId}",\n  "eventType": "JMS_QUEUE_PAYLOAD",\n  "timestamp": "${storedDate.toISOString()}",\n  "payload": {\n    "orderId": "ORD-2026-9901",\n    "status": "QUEUED_FAILURE",\n    "retryCount": 3\n  }\n}`;

        return {
          found: true,
          storageType,
          dataStoreName: storageType === 'DATASTORE' ? effectiveName : undefined,
          queueName: storageType === 'JMS' ? effectiveName : undefined,
          entryId: `ENTRY_${messageId.substring(0, 10)}`,
          storedAt: storedDate.toISOString().replace('T', ' ').substring(0, 19),
          sizeBytes: sampleBody.length,
          body: sampleBody,
          contentType: storageType === 'DATASTORE' ? 'application/xml' : 'application/json',
          expireDays,
          daysRemaining,
          isExpired: false
        };
      }
      return {
        found: false,
        storageType,
        notFoundReason: `입력하신 Message ID (${messageId})를 ${storageType === 'DATASTORE' ? 'Data Store' : 'JMS Queue'}에서 찾을 수 없습니다.`
      };
    }
  },

  /** 메시지 재처리 실행 (선택된 Body를 해당 엔드포인트로 재전송) */
  async executeReprocess(payload: {
    tenantId: number;
    artifactId: number | string;
    messageId: string;
    storageType?: 'DATASTORE' | 'JMS';
    storageName?: string;
    tenantName?: string;
    artifactName?: string;
  }): Promise<ReprocessExecutionResult> {
    try {
      return await fetchApi<ReprocessExecutionResult>(`/tenants/${payload.tenantId}/reprocess-execute`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Mock Fallback
      const isSuccess = Math.random() > 0.1; // 90% 성공률
      const resultEntry: ReprocessHistoryEntry = {
        id: Date.now(),
        executedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        tenantName: payload.tenantName || `Tenant #${payload.tenantId}`,
        artifactName: payload.artifactName || `Artifact #${payload.artifactId}`,
        messageId: payload.messageId,
        storageType: payload.storageType || 'DATASTORE',
        storageName: payload.storageName || 'DS_DEFAULT',
        executedBy: 'admin@iflow.com',
        result: isSuccess ? 'SUCCESS' : 'FAILED',
        responseCode: isSuccess ? 200 : 500,
        responseMessage: isSuccess ? 'HTTP 200 OK: Reprocessed successfully to iFlow Endpoint' : 'HTTP 500 Internal Error: Connection Reset'
      };

      reprocessHistoryStore.unshift(resultEntry);

      return {
        success: isSuccess,
        storageType: payload.storageType || 'DATASTORE',
        responseCode: isSuccess ? 200 : 500,
        message: isSuccess ? '메시지 재처리가 성공적으로 완료되었습니다. (엔드포인트 200 OK)' : '메시지 재처리 실행 중 타겟 엔드포인트 응답 오류가 발생했습니다.',
        executedAt: resultEntry.executedAt
      };
    }
  },

  /** 메시지 재처리 이력 목록 조회 */
  async getReprocessHistory(tenantId?: number): Promise<ReprocessHistoryEntry[]> {
    try {
      const url = tenantId ? `/reprocess-history?tenantId=${tenantId}` : '/reprocess-history';
      return await fetchApi<ReprocessHistoryEntry[]>(url);
    } catch (e) {
      if (tenantId) {
        return reprocessHistoryStore.filter(h => h.tenantName.includes(String(tenantId)));
      }
      return reprocessHistoryStore;
    }
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
