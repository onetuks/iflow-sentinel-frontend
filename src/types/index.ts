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
  logLevel?: LogLevel;
  emailConfig?: TenantEmailConfig;
  // 인터페이스(런타임/재처리) 호출 권한용 인증 정보 (Basic Auth)
  interfaceUrl?: string;
  interfaceTokenUrl?: string;
  interfaceAuthType?: 'BASIC' | 'OAUTH2_CLIENT_CREDENTIALS';
  interfaceUsername?: string;
  interfacePassword?: string;
}

export type LogLevel = 'NONE' | 'INFO' | 'ERROR' | 'DEBUG' | 'TRACE';
export type LogLevelType = LogLevel;

export interface TenantLogLevelResponse {
  tenantId: number;
  logLevel: LogLevel;
}

export interface TenantLogLevelRequest {
  logLevel: LogLevel;
}

export interface TenantLogLevelConfig {
  tenantId: number;
  logLevel: LogLevel;
  applyToAll?: boolean;
  targetPackageId?: number;
}

export interface TenantNotificationConfig {
  id?: number;
  tenantId: number;
  tenantName?: string;
  isEnabled: boolean;
  recipients: string;
  intervalMinutes?: number; // 실패 메시지 탐색 주기 (분 단위, 기본값: 10)
  lastNotifiedAt?: string;
}

export interface TenantNotificationConfigRequest {
  isEnabled: boolean;
  recipients: string;
  intervalMinutes?: number; // 실패 메시지 탐색 주기 (분 단위)
}

export interface TestEmailRequest {
  targetEmail: string;
}

export interface TenantEmailConfig {
  tenantId?: number;
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  security: 'NONE' | 'STARTTLS' | 'SSL_TLS';
  username: string;
  password?: string;
  senderEmail: string;
  recipientEmails: string;
  updatedAt?: string;
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
  status: 'FAILED' | 'ESCALATED' | 'CANCELLED' | string;
  logStart: string;
  logEnd: string;
  artifactId?: string;
  artifactName?: string;
  storageName?: string;
  storageType?: string;
  expirationStatus?: string;
  daysUntilExpiration?: number;
  errorDetail?: string;
  customHeader?: string;
}

/** 테넌트 x 아티팩트 저장소 수동 매핑 설정 (Backend StorageMappingDto 규격) */
export interface StorageMapping {
  id?: number;
  tenantId: number;
  artifactId: string;
  storageType: 'DATASTORE' | 'JMS';
  storageName: string;
  expireDays?: number;
  confidenceLevel?: 'AUTO_PARSED' | 'MANUAL_INPUT' | 'MANUAL_OVERRIDDEN' | 'DEFAULT_FALLBACK';
  updatedAt?: string;
  // UI 호환 필드
  detectedName?: string;
  suggestedName?: string;
  overrideName?: string;
  confidence?: 'HIGH' | 'LOW' | 'MANUAL';
}

/** Data Store 또는 JMS Queue에서 Message ID로 조회한 엔트리 결과 (Backend MessageBodyResponse 규격 매핑) */
export interface DataStoreEntryLookupResult {
  found: boolean;
  messageId?: string;
  storageType?: 'DATASTORE' | 'JMS';
  dataStoreName?: string;
  queueName?: string;
  storageName?: string;
  entryId?: string;
  storedAt?: string;
  fetchedAt?: string;
  sizeBytes?: number;
  body?: string;
  messageBody?: string;
  contentType?: string;
  expireDays?: number;
  daysRemaining?: number;
  daysUntilExpiration?: number;
  isExpired?: boolean;
  deepLinkUrl?: string;
  notFoundReason?: string;
}

/** 메시지 재처리 실행 요청 (Backend MessageReprocessRequest 규격 매핑) */
export interface MessageReprocessRequest {
  tenantId: number;
  artifactId: string;
  messageId: string;
  storageType: 'DATASTORE' | 'JMS';
  storageName: string;
  reprocessedBy?: string;
}

/** 메시지 재처리 실행 결과 (Backend MessageReprocessResult 규격 매핑) */
export interface ReprocessExecutionResult {
  historyId?: number;
  success: boolean;
  messageId?: string;
  storageType?: 'DATASTORE' | 'JMS';
  storageName?: string;
  statusMessage?: string;
  reprocessedAt?: string;
  deepLinkUrl?: string;
  // UI 하위 호환 필드
  responseCode?: number;
  message?: string;
  executedAt?: string;
}

export type ReprocessStatus = 'SUCCESS' | 'FAILED' | 'PENDING';

/** 메시지 재처리 이력 한 건 (Backend ReprocessHistoryResponse 규격 매핑) */
export interface ReprocessHistoryEntry {
  id: number;
  tenantId?: number;
  tenantName?: string;
  artifactId?: string;
  artifactName?: string;
  messageId: string;
  storageType: 'DATASTORE' | 'JMS';
  storageName: string;
  status?: ReprocessStatus | string;
  statusMessage?: string;
  reprocessedAt?: string;
  reprocessedBy?: string;
  deepLinkUrl?: string;

  // UI 하위 호환 필드
  executedAt?: string;
  executedBy?: string;
  result?: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
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
