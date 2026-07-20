import type { CheckRun, Finding, Tenant, IFlow } from '../types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 't1', projectId: 'p1', tenantName: 'S-Oil DEV', odataUrl: 'soil-dev.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '최근 09:14', packageCount: 22 },
  { id: 't2', projectId: 'p1', tenantName: 'S-Oil QAS', odataUrl: 'soil-qas.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'error', lastChecked: '최근 13:20', packageCount: 22 },
  { id: 't3', projectId: 'p1', tenantName: 'S-Oil PRD', odataUrl: 'soil-prd.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '3일 전', packageCount: 20 },
];

export const MOCK_CHECK_RUNS: CheckRun[] = [
  { id: 'cr1', projectId: 'p1', tenantName: 'S-Oil QAS', startedAt: '2026-07-13 13:20', status: 'COMPLETED', summary: { pass: 12, warn: 3, fail: 2 }, verdict: '보류 권고' },
  { id: 'cr2', projectId: 'p1', tenantName: 'S-Oil DEV', startedAt: '2026-07-13 09:14', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
  { id: 'cr3', projectId: 'p1', tenantName: 'S-Oil PRD', startedAt: '2026-07-10 16:02', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
];

export const MOCK_IFLOWS: IFlow[] = [
  { id: 'if1', name: 'MM0101_ERP_GUAS', protocol: 'HTTP', version: 'v3' },
  { id: 'if2', name: 'FI0003_GQMS_B2Bi', protocol: 'OData', version: 'v5' },
  { id: 'if3', name: 'SD0010_CRM_ERP', protocol: 'SOAP', version: 'v7' },
  { id: 'if4', name: 'HR0005_WD_SF', protocol: 'ProcessDirect', version: 'v2' },
];

export const MOCK_FINDINGS: Finding[] = [
  { id: 'f1', checkRunId: 'cr1', artifactId: 'a1', ruleKey: 'no-hardcoded-endpoint', severity: 'fail', location: 'QAS', message: '엔드포인트 외부화 필수', count: 8 },
  { id: 'f2', checkRunId: 'cr1', artifactId: 'a2', ruleKey: 'must-have-error-handler', severity: 'warn', location: 'QAS', message: '예외 처리 서브프로세스 필수', count: 5 },
  { id: 'f3', checkRunId: 'cr1', artifactId: 'a3', ruleKey: 'sender-naming', severity: 'fail', location: 'QAS', message: '송신 시스템 이름 규칙 위반', count: 4 },
  { id: 'f4', checkRunId: 'cr1', artifactId: 'a4', ruleKey: 'required-logging', severity: 'warn', location: 'QAS', message: '로깅 스텝 누락', count: 3 },
];

export interface AppRule {
  id: string;
  name: string;
  scope: '전역 규칙' | '프로젝트 규칙';
  scopeType: 'global' | 'project';
  description: string;
  enabled: boolean;
  statusText: string;
  statusClass: string;
  ruleType: string;
  severity: 'fail' | 'warn' | 'info';
  ruleMsg: string;
}

export const MOCK_RULES: AppRule[] = [
  {
    id: 'sender-naming',
    name: 'sender-naming',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '접두사에 SOIL_ 추가 · 전역 원본(OP_/B2B_/CP_)은 꺼짐',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'naming-convention',
    severity: 'fail',
    ruleMsg: '송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.'
  },
  {
    id: 'required-logging',
    name: 'required-logging',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '심각도 warn (전역 fail 대신 이 프로젝트 전용 값 사용)',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'required-logging',
    severity: 'warn',
    ruleMsg: '처리 단계에 로깅 스텝이 없습니다.'
  },
  {
    id: 'soil-system-code-whitelist',
    name: 'soil-system-code-whitelist',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '전역에 없음 · SOIL_ERP, SOIL_MES 시스템 코드만 허용',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-pass-line bg-pass-bg text-pass',
    ruleType: 'custom-expression',
    severity: 'info',
    ruleMsg: '허용되지 않은 시스템 코드입니다.'
  },
  {
    id: 'mapping-step-limit',
    name: 'mapping-step-limit',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '사용자 정의 조건식 · 매핑 스텝 5개 초과 시 warn',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-pass-line bg-pass-bg text-pass',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: '매핑 스텝이 5개를 초과했습니다.'
  },
  {
    id: 'allowed-script-language',
    name: 'allowed-script-language',
    scope: '전역 규칙',
    scopeType: 'global',
    description: 'Groovy만 허용 · fail',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'fail',
    ruleMsg: '허용되지 않은 스크립트 언어입니다.'
  },
  {
    id: 'no-hardcoded-endpoint',
    name: 'no-hardcoded-endpoint',
    scope: '전역 규칙',
    scopeType: 'global',
    description: '엔드포인트 외부화 필수 · fail',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'fail',
    ruleMsg: '엔드포인트 외부화가 필요합니다.'
  },
  {
    id: 'must-have-error-handler',
    name: 'must-have-error-handler',
    scope: '전역 규칙',
    scopeType: 'global',
    description: '예외 처리 서브프로세스 필수 · warn',
    enabled: true,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: '예외 처리 서브프로세스가 존재하지 않습니다.'
  },
  {
    id: 'processdirect-pairing',
    name: 'processdirect-pairing',
    scope: '전역 규칙',
    scopeType: 'global',
    description: 'PD 송·수신 짝 검증 · warn',
    enabled: false,
    statusText: '전역 규칙',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'custom-expression',
    severity: 'warn',
    ruleMsg: 'ProcessDirect 짝이 맞지 않습니다.'
  }
];

export const MOCK_PROJECTS = [
  { name: 'S-Oil IS 전환', initial: 'S', gradient: 'from-[#F0A35E] to-[#E0663C]' },
  { name: 'NanoH2O IS 전환', initial: 'N', gradient: 'from-[#5AC8E0] to-[#3E8BD0]' },
  { name: 'Hynix 신규 개발', initial: 'H', gradient: 'from-[#8B7DF0] to-[#5B4BD0]' }
];

export const MOCK_RUN_STEPS = [
  { p: 15, l: '아티팩트 다운로드 중…' },
  { p: 45, l: '.iflw 파싱 중…' },
  { p: 70, l: '규칙 적용 중…' },
  { p: 92, l: 'cross-artifact 검사…' },
  { p: 100, l: '완료' }
];

export const MOCK_ARTIFACTS = [
  { id: 'GMES_GQMS_EA_PQCRESULT_01', name: 'GMES_GQMS_EA_PQCRESULT_01', package: 'EA to GQMS Integration' },
  { id: 'S_OIL_ERP_PO_01', name: 'S_OIL_ERP_PO_01', package: 'ERP Interfaces' },
  { id: 'Hynix_MES_Sync', name: 'Hynix_MES_Sync', package: 'MES Core' }
];

export const MOCK_PARSED_MODEL: any = {
  schemaVersion: 1,
  artifact: {
    name: "GMES_GQMS_EA_PQCRESULT_01",
    symbolicName: "GMES_GQMS_EA_PQCRESULT_01",
    version: "1.0.5",
    bundleType: "IntegrationFlow",
    description: "[P01700_HTTP_HTTP_Async] ...",
    requiredCapabilities: [
      { type: "ScriptCollection", name: "ScriptCollection_SMARTSHIFT", resolution: "optional" },
      { type: "FunctionLibraries", name: "FunctionalLibraries" }
    ]
  },
  iflow: {
    config: {
      log: "All events",
      returnExceptionToSender: "false",
      ServerTrace: "false",
      httpSessionHandling: "None",
      corsEnabled: "false"
    },
    participants: [
      { id: "Participant_1", name: "Sender", type: "EndpointSender", role: "sender" },
      { id: "Participant_2", name: "Receiver", type: "EndpointReceiver", role: "receiver" },
      { id: "Process_12", name: "LocalIntegrationProcess", type: "Process", role: "process" }
    ],
    channels: [
      {
        id: "MessageFlow_7235311",
        name: "HTTPS",
        direction: "Sender",
        adapterType: "HTTPS",
        transportProtocol: "HTTPS",
        system: "Sender",
        address: "{{Sender_Address}}",
        externalizedRefs: ["Sender_Address"],
        auth: { senderAuthType: "RoleBased", userRole: "ESBMessaging.send" },
        properties: { httpMethod: "POST", proxyType: "sapcc" }
      },
      {
        id: "MessageFlow_7235312",
        name: "HTTP",
        direction: "Receiver",
        adapterType: "HTTP",
        transportProtocol: "HTTP",
        system: "Receiver",
        address: "{{Receiver_Address}}/xmlsql/JDBC_Receiver_GQMS",
        externalizedRefs: ["Receiver_Address", "L_Location_ID"],
        auth: { authenticationMethod: "None" }
      }
    ],
    processes: [
      { id: "Process_7706", name: "Main Process", processType: "IntegrationProcess" }
    ],
    events: [
      { id: "StartEvent_2", name: "Start", kind: "start", type: "MessageStartEvent", processId: "Process_1" }
    ],
    gateways: [
      { id: "ExclusiveGateway_0", name: "Router", type: "ExclusiveGateway", default: "SequenceFlow_0" }
    ],
    sequenceFlows: [
      { id: "SequenceFlow_7235214", name: "Retries > '3'", sourceRef: "...", targetRef: "...", condition: "${header.SAP_DataStoreRetries} > '3'", isDefault: false }
    ],
    steps: [
      {
        id: "CallActivity_57",
        name: "MM_Request",
        type: "Mapping",
        processId: "Process_7706",
        mapping: {
          type: "MessageMapping",
          name: "MM_GMES_GQMS_EA_PQCRESULT_01",
          uri: "dir://mmap/.../MM_....mmap",
          reference: "static"
        }
      },
      {
        id: "CallActivity_58",
        name: "Check PayloadMode",
        type: "Script",
        processId: "Process_7706",
        script: {
          file: "Check PayloadMode.groovy",
          language: "Groovy",
          bundleId: "ScriptCollection_SMARTSHIFT"
        }
      }
    ],
    exceptionSubprocesses: []
  },
  parameters: [
    { name: "Receiver_Address", value: "${property.L_System_DEST_1}", type: "xsd:string", isRequired: "false", isUsed: true },
    { name: "Sender_Address", value: "/api/v1/sender", type: "xsd:string", isRequired: "true", isUsed: true }
  ],
  mappings: [
    {
      name: "MM_GMES_GQMS_EA_PQCRESULT_01",
      sourceMessage: { file: "outbound.wsdl", type: "MT_GMES_GQMS_EA_PQCRESULT_01_S" },
      targetMessage: { file: "inbound.wsdl", type: "MT_GMES_GQMS_EA_PQCRESULT_01_T" },
      functions: [
        { name: "const", standard: true },
        { name: "FL_GQMS.String to NVARCHAR", standard: false, library: "FunctionalLibraries$FL_GQMS" }
      ],
      fieldCount: { source: 20, target: 30 }
    }
  ],
  schemas: [
    { file: "inbound.wsdl", name: "GMES_GQMS_EA_PQCRESULT_01_AI", targetNamespace: "http://www.lgchem.com/GMES/GQMS", messageTypes: ["MT_GMES_GQMS_EA_PQCRESULT_01_T"] }
  ],
  scripts: []
};
