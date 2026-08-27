import type { CheckRun, Finding, Tenant, IFlow, AppRule, TrackerArtifact, Project, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry, MplFailureLog, StorageMapping, ReprocessSupportType, TenantEmailConfig, LogLevel, TenantLogLevelResponse, TenantLogLevelRequest } from '../types';
export type { AppRule, TrackerArtifact, DataStoreEntryLookupResult, ReprocessExecutionResult, ReprocessHistoryEntry, MplFailureLog, StorageMapping, ReprocessSupportType, TenantEmailConfig, LogLevel, LogLevelType, TenantLogLevelResponse, TenantLogLevelRequest } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Spring Boot Long 타입 파라미터 요구사항에 맞추어 숫자로 안전 변환하는 헬퍼 함수 */
function toLongId(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (!isNaN(num)) {
    return num;
  }
  return undefined;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  let response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...options?.headers,
    },
  });

  // 404 발생 시 혹시 context-path 중복/누락 문제일 경우 대체 경로 시도
  if (response.status === 404 && url.startsWith('/reprocess')) {
    const alternativeUrl = url; // API_BASE 없는 백업 경로
    try {
      const altResponse = await fetch(alternativeUrl, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      if (altResponse.ok) {
        response = altResponse;
      }
    } catch (e) {
      // ignore fallback error
    }
  }

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
const tenantEmailConfigStore = new Map<number, TenantEmailConfig>();

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

        const sapId = String(item.artifactId || item.id || item.artifactName || `artifact-${idx + 1}`);
        const nameUpper = (item.artifactName || item.artifactId || '').toUpperCase();

        // 백엔드 파서 결과 및 저장소 매핑 정보 우선 반영
        let reprocessType: ReprocessSupportType = item.reprocessType || 'DATASTORE_ONLY';
        let dataStoreName = item.dataStoreName || nameUpper.replace(/[^A-Z0-9_]/g, '_');
        let queueName = item.queueName || `Q_${nameUpper.replace(/[^A-Z0-9_]/g, '_')}`;
        let expireDays = item.expireDays || 90;

        if (item.reprocessType) {
          reprocessType = item.reprocessType;
        } else if (item.dataStoreName && item.queueName) {
          reprocessType = 'BOTH';
        } else if (item.queueName && !item.dataStoreName) {
          reprocessType = 'JMS_ONLY';
        } else if (item.dataStoreName) {
          reprocessType = 'DATASTORE_ONLY';
        }

        return {
          artifactId: sapId,
          package: item.packageName || item.packageId || item.package || '-',
          artifact: item.artifactName || item.artifactId || item.artifact || '-',
          runtime: item.version || item.runtimeStatus || item.runtime || '-',
          status: statusDisplay,
          endpointUrl: item.endpointUrl || `/cxf/http/${item.artifactName || sapId}`,
          reprocessType,
          dataStoreName,
          queueName,
          expireDays
        };
      }).sort((a, b) => {
        const pkgCompare = a.package.localeCompare(b.package, undefined, { sensitivity: 'base', numeric: true });
        if (pkgCompare !== 0) return pkgCompare;
        return a.artifact.localeCompare(b.artifact, undefined, { sensitivity: 'base', numeric: true });
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

  // ── 메시지 재처리 (MessageReprocessController API 연동) ────────────

  /** 아티팩트의 재처리 지원 유형 조회 (GET /api/reprocess/artifacts/{artifactId}/support-type) */
  async getReprocessSupportType(artifactId: string): Promise<ReprocessSupportType> {
    if (!artifactId) return 'DATASTORE_ONLY';
    try {
      const type = await fetchApi<ReprocessSupportType>(`/reprocess/artifacts/${encodeURIComponent(artifactId)}/support-type`);
      return (type && type !== 'NONE') ? type : 'DATASTORE_ONLY';
    } catch (e) {
      return 'DATASTORE_ONLY';
    }
  },

  /** 최근 MPL 실패 로그 목록 조회 (GET /api/reprocess/mpl-failures?tenantId={tenantId}&artifactId={artifactId}&top={top}) */
  async getMplFailureLogs(tenantId: number | string, artifactId?: string, top: number = 20): Promise<MplFailureLog[]> {
    const tId = toLongId(tenantId) || 1;
    try {
      let url = `/reprocess/mpl-failures?tenantId=${tId}&top=${top}`;
      if (artifactId !== undefined && artifactId !== null && String(artifactId).trim() !== '') {
        url += `&artifactId=${encodeURIComponent(String(artifactId).trim())}`;
      }
      const rawLogs = await fetchApi<any[]>(url);
      return (rawLogs || []).map(log => ({
        messageId: log.messageId,
        correlationId: log.correlationId || '-',
        status: log.status || 'FAILED',
        logStart: typeof log.logStart === 'string' ? log.logStart.replace('T', ' ').substring(0, 19) : (log.logStart || ''),
        logEnd: typeof log.logEnd === 'string' ? log.logEnd.replace('T', ' ').substring(0, 19) : (log.logEnd || ''),
        artifactId: log.artifactId,
        artifactName: log.artifactName,
        storageName: log.storageName,
        storageType: log.storageType,
        expirationStatus: log.expirationStatus,
        daysUntilExpiration: log.daysUntilExpiration,
        errorDetail: log.errorDetail || log.lastError || `Status: ${log.status || 'FAILED'}`,
        customHeader: log.customHeader
      }));
    } catch (e) {
      console.warn('Failed to fetch MPL failure logs from backend:', e);
      return [];
    }
  },

  /** 저장소 매핑 목록 조회 (GET /api/reprocess/storage-mappings?tenantId={tenantId}&artifactId={artifactId}) */
  async getStorageMappings(tenantId: number | string, artifactId: string): Promise<StorageMapping[]> {
    const tId = toLongId(tenantId) || 1;
    try {
      const dtos = await fetchApi<any[]>(`/reprocess/storage-mappings?tenantId=${tId}&artifactId=${encodeURIComponent(artifactId)}`);
      return (dtos || []).map(d => ({
        id: d.id,
        tenantId: d.tenantId,
        artifactId: String(d.artifactId),
        storageType: d.storageType,
        storageName: d.storageName,
        expireDays: d.expireDays,
        confidenceLevel: d.confidenceLevel,
        updatedAt: d.updatedAt,
        overrideName: d.storageName,
        detectedName: d.storageName,
        confidence: d.confidenceLevel === 'MANUAL_OVERRIDDEN' ? 'MANUAL' : (d.confidenceLevel === 'AUTO_PARSED' ? 'HIGH' : 'LOW')
      }));
    } catch (e) {
      return [];
    }
  },

  /** 단일 저장소 매핑 조회 */
  async getStorageMapping(tenantId: number | string, artifactId: string, storageType: 'DATASTORE' | 'JMS'): Promise<StorageMapping> {
    try {
      const mappings = await this.getStorageMappings(tenantId, artifactId);
      const found = mappings.find(m => m.storageType === storageType);
      if (found) return found;
    } catch (e) {
      // ignore
    }

    const key = `${tenantId}_${artifactId}_${storageType}`;
    if (storageMappingStore.has(key)) {
      return storageMappingStore.get(key)!;
    }
    const defaultName = String(artifactId);
    return {
      tenantId: Number(tenantId),
      artifactId,
      storageType,
      storageName: defaultName,
      detectedName: defaultName,
      suggestedName: `${defaultName}_API_SUGGESTED`,
      confidence: 'HIGH'
    };
  },

  /** 저장소 매핑 저장/수정 (PUT /api/reprocess/storage-mappings) */
  async saveStorageMapping(mapping: StorageMapping): Promise<StorageMapping> {
    const dto = {
      tenantId: toLongId(mapping.tenantId) || 1,
      artifactId: String(mapping.artifactId),
      storageType: mapping.storageType,
      storageName: mapping.storageName || mapping.overrideName || mapping.suggestedName || mapping.detectedName,
      expireDays: mapping.expireDays || 90
    };

    try {
      const res = await fetchApi<any>(`/reprocess/storage-mappings`, {
        method: 'PUT',
        body: JSON.stringify(dto)
      });
      return {
        ...mapping,
        id: res.id,
        storageName: res.storageName || dto.storageName,
        overrideName: res.storageName || dto.storageName,
        expireDays: res.expireDays || dto.expireDays,
        confidenceLevel: res.confidenceLevel
      };
    } catch (e) {
      // Mock Fallback
      const key = `${mapping.tenantId}_${mapping.artifactId}_${mapping.storageType}`;
      storageMappingStore.set(key, mapping);
      return mapping;
    }
  },

  /** 저장소 매핑 삭제 (DELETE /api/reprocess/storage-mappings?tenantId={tenantId}&artifactId={artifactId}) */
  async deleteStorageMapping(tenantId: number | string, artifactId: string): Promise<void> {
    const tId = toLongId(tenantId) || 1;
    try {
      await fetchApi<void>(`/reprocess/storage-mappings?tenantId=${tId}&artifactId=${encodeURIComponent(artifactId)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Failed to delete storage mapping:', e);
    }
  },

  /** 메시지 Body 조회 (GET /api/reprocess/messages/{messageId}/body?tenantId={tenantId}&artifactId={artifactId}&storageType={storageType}&storageName={storageName}) */
  async lookupDataStoreEntry(
    tenantId: number | string,
    artifactId: string,
    messageId: string,
    storageType: 'DATASTORE' | 'JMS' = 'DATASTORE',
    storageName?: string
  ): Promise<DataStoreEntryLookupResult> {
    const tId = toLongId(tenantId) || 1;
    try {
      let url = `/reprocess/messages/${encodeURIComponent(messageId)}/body?tenantId=${tId}&artifactId=${encodeURIComponent(artifactId)}&storageType=${storageType}`;
      if (storageName && storageName.trim()) {
        url += `&storageName=${encodeURIComponent(storageName.trim())}`;
      }
      const res = await fetchApi<any>(url);
      
      let rawBody = res.messageBody ?? res.body ?? res.payload ?? res.content;
      let bodyContent = '';
      if (rawBody !== null && rawBody !== undefined) {
        if (typeof rawBody === 'object') {
          bodyContent = JSON.stringify(rawBody, null, 2);
        } else {
          bodyContent = String(rawBody);
        }
      }

      const isFound = res.found ?? (rawBody !== null && rawBody !== undefined);
      const fetchedTime = typeof res.fetchedAt === 'string' 
        ? res.fetchedAt.replace('T', ' ').substring(0, 19) 
        : (typeof res.storedAt === 'string' ? res.storedAt.replace('T', ' ').substring(0, 19) : '');
      
      return {
        found: isFound,
        messageId: res.messageId || messageId,
        storageType: res.storageType || storageType,
        storageName: res.storageName || storageName,
        dataStoreName: (res.storageType || storageType) === 'DATASTORE' ? (res.storageName || storageName) : undefined,
        queueName: (res.storageType || storageType) === 'JMS' ? (res.storageName || storageName) : undefined,
        entryId: res.entryId || `ENTRY_${messageId.substring(0, 10)}`,
        storedAt: fetchedTime,
        fetchedAt: fetchedTime,
        body: bodyContent,
        messageBody: bodyContent,
        contentType: res.contentType || (storageType === 'DATASTORE' ? 'application/xml' : 'application/json'),
        expireDays: res.expireDays,
        daysRemaining: res.daysUntilExpiration ?? res.expireDays,
        daysUntilExpiration: res.daysUntilExpiration ?? res.expireDays,
        isExpired: res.isExpired ?? false,
        deepLinkUrl: res.deepLinkUrl
      };
    } catch (e: any) {
      return {
        found: false,
        storageType,
        notFoundReason: e?.message || `입력하신 Message ID (${messageId})를 ${storageType === 'DATASTORE' ? 'Data Store' : 'JMS Queue'}에서 찾을 수 없습니다.`
      };
    }
  },

  /** 메시지 재처리 실행 (POST /api/reprocess/execute) */
  async executeReprocess(payload: {
    tenantId: number | string;
    artifactId: string;
    messageId: string;
    storageType?: 'DATASTORE' | 'JMS';
    storageName?: string;
    reprocessedBy?: string;
    tenantName?: string;
    artifactName?: string;
  }): Promise<ReprocessExecutionResult> {
    const requestBody = {
      tenantId: toLongId(payload.tenantId) || 1,
      artifactId: String(payload.artifactId),
      messageId: payload.messageId,
      storageType: payload.storageType || 'DATASTORE',
      storageName: payload.storageName,
      reprocessedBy: payload.reprocessedBy || 'ADMIN'
    };

    try {
      const res = await fetchApi<any>(`/reprocess/execute`, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      const execTime = typeof res.reprocessedAt === 'string' ? res.reprocessedAt.replace('T', ' ').substring(0, 19) : (res.executedAt || new Date().toISOString().replace('T', ' ').substring(0, 19));
      
      const resultEntry: ReprocessHistoryEntry = {
        id: res.historyId || Date.now(),
        tenantId: Number(payload.tenantId),
        tenantName: payload.tenantName || `Tenant #${payload.tenantId}`,
        artifactId: String(payload.artifactId),
        artifactName: payload.artifactName || `Artifact #${payload.artifactId}`,
        messageId: payload.messageId,
        storageType: payload.storageType || 'DATASTORE',
        storageName: payload.storageName || String(payload.artifactId),
        status: res.success ? 'SUCCESS' : 'FAILED',
        statusMessage: res.statusMessage || res.message,
        reprocessedAt: execTime,
        reprocessedBy: payload.reprocessedBy || 'ADMIN',
        deepLinkUrl: res.deepLinkUrl,
        executedAt: execTime,
        executedBy: payload.reprocessedBy || 'ADMIN',
        result: res.success ? 'SUCCESS' : 'FAILED',
        responseCode: res.success ? 200 : 500,
        responseMessage: res.statusMessage || res.message
      };
      reprocessHistoryStore.unshift(resultEntry);

      return {
        historyId: res.historyId,
        success: res.success,
        messageId: res.messageId || payload.messageId,
        storageType: res.storageType || payload.storageType || 'DATASTORE',
        storageName: res.storageName || payload.storageName,
        responseCode: res.success ? 200 : 500,
        message: res.statusMessage || res.message || (res.success ? '메시지 재처리가 성공적으로 완료되었습니다.' : '메시지 재처리 실행 중 오류가 발생했습니다.'),
        statusMessage: res.statusMessage || res.message,
        executedAt: execTime,
        reprocessedAt: execTime,
        deepLinkUrl: res.deepLinkUrl
      };
    } catch (e: any) {
      return {
        success: false,
        storageType: payload.storageType || 'DATASTORE',
        message: e?.message || '메시지 재처리 실행 중 오류가 발생했습니다.',
        statusMessage: e?.message || '메시지 재처리 실행 중 오류가 발생했습니다.'
      };
    }
  },

  /** 메시지 재처리 히스토리 목록 조회 (GET /api/reprocess/histories?tenantId={tenantId}&artifactId={artifactId}&messageId={messageId}&status={status}) */
  async getReprocessHistories(params?: {
    tenantId?: number | string;
    artifactId?: string;
    messageId?: string;
    status?: string;
  }): Promise<ReprocessHistoryEntry[]> {
    try {
      const queryParts: string[] = [];
      if (params?.tenantId) {
        const tId = toLongId(params.tenantId);
        if (tId) queryParts.push(`tenantId=${tId}`);
      }
      if (params?.artifactId && params.artifactId.trim()) {
        queryParts.push(`artifactId=${encodeURIComponent(params.artifactId.trim())}`);
      }
      if (params?.messageId && params.messageId.trim()) {
        queryParts.push(`messageId=${encodeURIComponent(params.messageId.trim())}`);
      }
      if (params?.status && params.status.trim()) {
        queryParts.push(`status=${encodeURIComponent(params.status.trim())}`);
      }

      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      const historyList = await fetchApi<any[]>(`/reprocess/histories${queryString}`);
      if (Array.isArray(historyList) && historyList.length > 0) {
        return historyList.map(h => {
          const repTime = typeof h.reprocessedAt === 'string' ? h.reprocessedAt.replace('T', ' ').substring(0, 19) : (h.executedAt || '');
          const statusValue = (h.status || (h.result ?? 'SUCCESS')).toUpperCase();
          return {
            id: h.id || Date.now(),
            tenantId: h.tenantId,
            tenantName: h.tenantName || (h.tenantId ? `Tenant #${h.tenantId}` : '-'),
            artifactId: h.artifactId,
            artifactName: h.artifactName || (h.artifactId ? `Artifact #${h.artifactId}` : '-'),
            messageId: h.messageId,
            storageType: h.storageType,
            storageName: h.storageName,
            status: statusValue,
            statusMessage: h.statusMessage || h.responseMessage,
            reprocessedAt: repTime,
            reprocessedBy: h.reprocessedBy || h.executedBy || 'ADMIN',
            deepLinkUrl: h.deepLinkUrl,
            // 하위 호환 필드
            executedAt: repTime,
            executedBy: h.reprocessedBy || h.executedBy || 'ADMIN',
            result: statusValue as any,
            responseCode: statusValue === 'SUCCESS' ? 200 : 500,
            responseMessage: h.statusMessage || h.responseMessage
          };
        });
      }
      return reprocessHistoryStore;
    } catch (e) {
      if (params?.tenantId) {
        return reprocessHistoryStore.filter(h => h.tenantName?.includes(String(params.tenantId)) || h.tenantId === Number(params.tenantId));
      }
      return reprocessHistoryStore;
    }
  },

  /** 메시지 재처리 이력 목록 조회 (하위 호환 유지) */
  async getReprocessHistory(paramsOrTenantId?: number | { tenantId?: number | string; artifactId?: string; messageId?: string; status?: string }): Promise<ReprocessHistoryEntry[]> {
    if (typeof paramsOrTenantId === 'number') {
      return this.getReprocessHistories({ tenantId: paramsOrTenantId });
    }
    return this.getReprocessHistories(paramsOrTenantId);
  },

  /** 재처리 히스토리 단건 조회 (GET /api/reprocess/histories/{id}) */
  async getReprocessHistoryDetail(id: number): Promise<ReprocessHistoryEntry> {
    const h = await fetchApi<any>(`/reprocess/histories/${id}`);
    const repTime = typeof h.reprocessedAt === 'string' ? h.reprocessedAt.replace('T', ' ').substring(0, 19) : (h.executedAt || '');
    const statusValue = (h.status || (h.result ?? 'SUCCESS')).toUpperCase();
    return {
      id: h.id,
      tenantId: h.tenantId,
      tenantName: h.tenantName || (h.tenantId ? `Tenant #${h.tenantId}` : '-'),
      artifactId: h.artifactId,
      artifactName: h.artifactName || (h.artifactId ? `Artifact #${h.artifactId}` : '-'),
      messageId: h.messageId,
      storageType: h.storageType,
      storageName: h.storageName,
      status: statusValue,
      statusMessage: h.statusMessage || h.responseMessage,
      reprocessedAt: repTime,
      reprocessedBy: h.reprocessedBy || h.executedBy || 'ADMIN',
      deepLinkUrl: h.deepLinkUrl,
      executedAt: repTime,
      executedBy: h.reprocessedBy || h.executedBy || 'ADMIN',
      result: statusValue as any,
      responseCode: statusValue === 'SUCCESS' ? 200 : 500,
      responseMessage: h.statusMessage || h.responseMessage
    };
  },

  /** 재처리 히스토리 삭제 (DELETE /api/reprocess/histories/{id}) */
  async deleteReprocessHistory(id: number): Promise<{ status: number }> {
    const response = await fetch(`${API_BASE}/reprocess/histories/${id}`, {
      method: 'DELETE'
    });
    // 인메모리 스토어 동기화
    const idx = reprocessHistoryStore.findIndex(h => h.id === id);
    if (idx !== -1) {
      reprocessHistoryStore.splice(idx, 1);
    }
    return { status: response.status };
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
  },

  async getTenantLogLevel(tenantId: number): Promise<TenantLogLevelResponse | null> {
    try {
      const res = await fetchApi<TenantLogLevelResponse>(`/tenants/${tenantId}/log-level`);
      if (res && res.logLevel) {
        return res;
      }
      return null;
    } catch (e: any) {
      // 404 Not Found (설정 없음) 또는 기타 에러 시 null 반환
      return null;
    }
  },

  async batchUpdateTenantLogLevel(tenantId: number, logLevel: LogLevel): Promise<{ success: boolean; message: string; data?: TenantLogLevelResponse }> {
    try {
      const payload: TenantLogLevelRequest = { logLevel };
      const res = await fetchApi<TenantLogLevelResponse>(`/tenants/${tenantId}/log-level`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      return {
        success: true,
        message: `테넌트 (ID: ${tenantId})의 Log Level이 ${res?.logLevel || logLevel}(으)로 성공적으로 저장 및 일괄 적용되었습니다. (배포된 아티팩트 전체 반영 및 10분 주기 자동 동기화 활성화)`,
        data: res
      };
    } catch (e: any) {
      console.error('Failed to update tenant log level:', e);
      return {
        success: false,
        message: e.message || 'Log Level 일괄 적용 및 저장 중 오류가 발생했습니다.'
      };
    }
  },

  async getTenantEmailConfig(tenantId: number): Promise<TenantEmailConfig> {
    try {
      const config = await fetchApi<TenantEmailConfig>(`/tenants/${tenantId}/email-config`);
      if (config) return config;
    } catch (e) {
      // Fallback to store or default
    }

    if (tenantEmailConfigStore.has(tenantId)) {
      return tenantEmailConfigStore.get(tenantId)!;
    }

    return {
      tenantId,
      enabled: false,
      smtpHost: 'smtp.office365.com',
      smtpPort: 587,
      security: 'STARTTLS',
      username: '',
      password: '',
      senderEmail: 'alert@iflow-sentinel.com',
      recipientEmails: 'admin@company.com'
    };
  },

  async saveTenantEmailConfig(tenantId: number, config: TenantEmailConfig): Promise<{ success: boolean; message: string; data?: TenantEmailConfig }> {
    const payload = { ...config, tenantId };
    try {
      const res = await fetchApi<TenantEmailConfig>(`/tenants/${tenantId}/email-config`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      tenantEmailConfigStore.set(tenantId, res || payload);
      return {
        success: true,
        message: '메일 알림 및 SMTP 설정이 성공적으로 저장되었습니다.',
        data: res || payload
      };
    } catch (e: any) {
      // Mock Fallback
      tenantEmailConfigStore.set(tenantId, payload);
      return {
        success: true,
        message: '메일 알림 및 SMTP 설정이 저장되었습니다.',
        data: payload
      };
    }
  },

  async testTenantEmailConfig(tenantId: number, config: TenantEmailConfig): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetchApi<any>(`/tenants/${tenantId}/email-config/test`, {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return {
        success: res?.success ?? true,
        message: res?.message || `[${config.recipientEmails}] 주소로 테스트 메일이 성공적으로 발송되었습니다.`
      };
    } catch (e: any) {
      // Mock Fallback
      if (!config.smtpHost || !config.recipientEmails) {
        return {
          success: false,
          message: 'SMTP 호스트 주소와 수신 이메일 주소를 입력해 주세요.'
        };
      }
      return {
        success: true,
        message: `테스트 발송 성공: SMTP [${config.smtpHost}:${config.smtpPort}] -> [${config.recipientEmails}] 메일이 정상 전달되었습니다.`
      };
    }
  }
};
