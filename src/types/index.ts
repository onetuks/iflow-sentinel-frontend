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
  id: string;
  name: string;
  protocol: string;
  version: string;
}
