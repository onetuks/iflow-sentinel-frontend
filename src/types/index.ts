export type Severity = 'FAIL' | 'WARN' | 'INFO';
export type TenantPlatform = 'NEO' | 'CLOUD_FOUNDRY';
export type RuleScope = 'SINGLE' | 'CROSS';

export interface Tenant {
  id: number;
  projectId: number;
  name: string;
  odataUrl: string;
  clientId: string;
  clientSecret?: string;
  tokenUrl: string;
  platformType: TenantPlatform;
  status?: 'connected' | 'disconnected' | 'error';
  lastChecked?: string;
  packageCount?: number;
}

export interface Rule {
  id: number;
  ruleKey: string;
  isGlobal: boolean;
  customProjectId?: number | null;
  type: string;
  severity: Severity;
  target?: any;
  params?: any;
  message: string;
  enabled: boolean;
}

export interface ProjectRule {
  project: string;
  rule: string;
  isEnabled: boolean;
}

export interface CheckRun {
  id: number;
  projectId: number;
  tenantName?: string;
  startedAt?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  verdict?: string;
}

export interface Finding {
  id: number;
  checkRunId?: number;
  artifactId: number;
  ruleId: number;
  ruleKey: string;
  severity: Severity;
  location: string;
  message: string;
  count?: number;
}

export interface IFlow {
  id: number;
  integrationPackageId: number;
  sapArtifactId: string;
  name: string;
  version: string;
  type: string;
}


export interface Project {
  id: number;
  name: string;
}

export type ReprocessSupportType = 'NONE' | 'DATASTORE_ONLY' | 'JMS_ONLY' | 'BOTH';

export interface TrackerArtifact {
  id: number | string;
  artifactId: string;
  package: string;
  artifact: string;
  runtime: string;
  status: 'Deployed' | 'Undeployed' | 'Illusion';
  endpointUrl?: string;
  reprocessType?: ReprocessSupportType;
  dataStoreName?: string;
  queueName?: string;
  expireDays?: number;
}

/** SAP IS MessageProcessingLogs 최근 실패 로그 */
export interface MplFailureLog {
  messageId: string;
  correlationId: string;
  status: 'FAILED' | 'ESCALATED' | 'CANCELLED';
  logStart: string;
  logEnd: string;
  errorDetail?: string;
  customHeader?: string;
}

/** 테넌트 x 아티팩트 저장소 수동 매핑 설정 */
export interface StorageMapping {
  tenantId: number;
  artifactId: number | string;
  storageType: 'DATASTORE' | 'JMS';
  detectedName: string; // 1단계 정적 파싱
  suggestedName?: string; // 2단계 SAP IS API 추정
  overrideName?: string; // 3단계 수동 오버라이드
  confidence: 'HIGH' | 'LOW' | 'MANUAL';
}

/** Data Store 또는 JMS Queue에서 Message ID로 조회한 엔트리 결과 */
export interface DataStoreEntryLookupResult {
  found: boolean;
  storageType?: 'DATASTORE' | 'JMS';
  dataStoreName?: string;
  queueName?: string;
  entryId?: string;
  storedAt?: string;
  sizeBytes?: number;
  body?: string;
  contentType?: string;
  expireDays?: number;
  daysRemaining?: number;
  isExpired?: boolean;
  notFoundReason?: string;
}

/** 메시지 재처리 실행 결과 */
export interface ReprocessExecutionResult {
  success: boolean;
  storageType?: 'DATASTORE' | 'JMS';
  responseCode?: number;
  message?: string;
  executedAt?: string;
}

/** 메시지 재처리 이력 한 건 */
export interface ReprocessHistoryEntry {
  id: number;
  executedAt: string;
  tenantName: string;
  artifactName: string;
  messageId: string;
  storageType: 'DATASTORE' | 'JMS';
  storageName: string;
  executedBy: string;
  result: 'SUCCESS' | 'FAILED';
  responseCode?: number;
  responseMessage?: string;
}

export interface AppRule {
  id: number;
  name: string;
  scope: '전역 규칙' | '프로젝트 규칙';
  scopeType: 'global' | 'project';
  description: string;
  enabled: boolean;
  statusText: string;
  statusClass: string;
  ruleType: string;
  severity: 'FAIL' | 'WARN' | 'INFO';
  ruleMsg: string;
}
