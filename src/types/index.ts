export type Severity = 'fail' | 'warn' | 'info';
export type TenantPlatform = 'NEO' | 'CLOUD_FOUNDRY';
export type RuleScope = 'SINGLE' | 'CROSS';

export interface Tenant {
  id: string;
  projectId: string;
  name: string;
  odataUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  platformType: TenantPlatform;
  status: 'connected' | 'disconnected' | 'error';
  lastChecked?: string;
  packageCount?: number;
}

export interface Rule {
  ruleKey: string;
  isGlobal: boolean;
  customProject?: string;
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
  id: string;
  projectId: string;
  tenantName: string;
  startedAt: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  summary: {
    pass: number;
    warn: number;
    fail: number;
  };
  verdict: string;
}

export interface Finding {
  id: string;
  checkRunId: string;
  artifactId: string;
  ruleKey: string;
  severity: Severity;
  location: string;
  message: string;
  count: number;
}

export interface IFlow {
  id: string;
  name: string;
  protocol: string;
  version: string;
}
