import type { CheckRun, Finding, Tenant, IFlow } from '../types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 1, projectId: 1, name: 'S-Oil DEV', odataUrl: 'soil-dev.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '최근 09:14', packageCount: 22 },
  { id: 2, projectId: 1, name: 'S-Oil QAS', odataUrl: 'soil-qas.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'error', lastChecked: '최근 13:20', packageCount: 22 },
  { id: 3, projectId: 1, name: 'S-Oil PRD', odataUrl: 'soil-prd.integrationsuite.cfapps...', clientId: '', clientSecret: '', tokenUrl: '', platformType: 'CLOUD_FOUNDRY', status: 'connected', lastChecked: '3일 전', packageCount: 20 },
];

export const MOCK_CHECK_RUNS: CheckRun[] = [
  { id: 1, projectId: 1, tenantName: 'S-Oil QAS', startedAt: '2026-07-13 13:20', status: 'COMPLETED', summary: { pass: 12, warn: 3, fail: 2 }, verdict: '보류 권고' },
  { id: 2, projectId: 1, tenantName: 'S-Oil DEV', startedAt: '2026-07-13 09:14', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
  { id: 3, projectId: 1, tenantName: 'S-Oil PRD', startedAt: '2026-07-10 16:02', status: 'COMPLETED', summary: { pass: 14, warn: 0, fail: 0 }, verdict: '통과' },
];

export const MOCK_IFLOWS: IFlow[] = [
  { id: 'if1', name: 'MM0101_ERP_GUAS', protocol: 'HTTP', version: 'v3' },
  { id: 'if2', name: 'FI0003_GQMS_B2Bi', protocol: 'OData', version: 'v5' },
  { id: 'if3', name: 'SD0010_CRM_ERP', protocol: 'SOAP', version: 'v7' },
  { id: 'if4', name: 'HR0005_WD_SF', protocol: 'ProcessDirect', version: 'v2' },
];

export const MOCK_FINDINGS: Finding[] = [
  { id: 1, checkRunId: 1, artifactId: 1, ruleId: 1, ruleKey: 'no-hardcoded-endpoint', severity: 'FAIL', location: 'QAS', message: '엔드포인트 외부화 필수', count: 8 },
  { id: 2, checkRunId: 1, artifactId: 2, ruleId: 2, ruleKey: 'must-have-error-handler', severity: 'WARN', location: 'QAS', message: '예외 처리 서브프로세스 필수', count: 5 },
  { id: 3, checkRunId: 1, artifactId: 3, ruleId: 3, ruleKey: 'sender-naming', severity: 'FAIL', location: 'QAS', message: '송신 시스템 이름 규칙 위반', count: 4 },
  { id: 4, checkRunId: 1, artifactId: 4, ruleId: 4, ruleKey: 'required-logging', severity: 'WARN', location: 'QAS', message: '로깅 스텝 누락', count: 3 },
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
  severity: 'FAIL' | 'WARN' | 'INFO';
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
    severity: 'FAIL',
    ruleMsg: '송신 시스템 이름은 OP_/B2B_/CP_ 접두사를 사용해야 합니다.'
  },
  {
    id: 'required-logging',
    name: 'required-logging',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '1개 이상',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'required-logging',
    severity: 'WARN',
    ruleMsg: '시작/종료 로깅 스텝이 각각 최소 1개 이상 존재해야 합니다.'
  },
  {
    id: 'allowed-adapter-types',
    name: 'allowed-adapter-types',
    scope: '전역 규칙',
    scopeType: 'global',
    description: 'HTTP, SOAP, ODataV2, SFTP',
    enabled: true,
    statusText: '라이브러리',
    statusClass: 'border-line-2 bg-surface-2 text-muted',
    ruleType: 'allowed-adapter-types',
    severity: 'FAIL',
    ruleMsg: '허용되지 않은 어댑터 타입이 감지되었습니다. (표준 어댑터 사용 권장)'
  },
  {
    id: 'custom-expr-1',
    name: 'custom-expr-1',
    scope: '프로젝트 규칙',
    scopeType: 'project',
    description: '복잡도 검증: 매핑 스텝이 5개 이하',
    enabled: true,
    statusText: '프로젝트 규칙',
    statusClass: 'border-[#D5DAFB] bg-primary-tint text-primary-600',
    ruleType: 'custom-expression',
    severity: 'INFO',
    ruleMsg: '매핑 스텝이 5개를 초과했습니다. iFlow 분리를 고려하세요.'
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

export interface TrackerArtifact {
  id: number;
  package: string;
  artifact: string;
  runtime: string;
  status: 'Deployed' | 'Illusion';
}

export const MOCK_TRACKER_ARTIFACTS: TrackerArtifact[] = [
  { id: 1, package: 'com.example.hr', artifact: 'HR_Employee_Sync', runtime: 'HR_Employee_Sync_PRD', status: 'Deployed' },
  { id: 2, package: 'com.example.hr', artifact: 'HR_Time_Record', runtime: 'HR_Time_Record_DEV', status: 'Deployed' },
  { id: 3, package: 'com.example.fi', artifact: 'FI_GL_Posting', runtime: 'FI_GL_Posting_v2', status: 'Illusion' },
  { id: 4, package: 'com.example.fi', artifact: 'FI_Vendor_Master', runtime: 'FI_Vendor_Master_QAS', status: 'Deployed' },
  { id: 5, package: 'com.example.logistics', artifact: 'LO_Delivery_Update', runtime: 'LO_Delivery_Update_PRD', status: 'Deployed' },
  { id: 6, package: 'com.example.logistics', artifact: 'LO_Stock_Sync', runtime: 'LO_Stock_Sync_Legacy', status: 'Illusion' },
  { id: 7, package: 'com.example.sales', artifact: 'SD_Order_Create', runtime: 'SD_Order_Create_PRD', status: 'Deployed' },
  { id: 8, package: 'com.example.sales', artifact: 'SD_Customer_Sync', runtime: 'SD_Customer_Sync_Legacy', status: 'Illusion' }
];

export const MOCK_CONFIGURED_PARAMETERS: Record<string, Record<string, any>> = {
  'S-Oil PRD': {
    '1': [
      { name: 'Receiver_Address', value: '${property.L_System_DEST_1}', configuredValue: '${property.L_System_DEST_1}', isRequired: 'false', description: '선택 파라미터 (Optional)' },
      { name: 'Sender_Address', value: '/api/v1/sender', configuredValue: '/api/prd/sender', isRequired: 'true', description: '필수 파라미터 (Required)' }
    ]
  },
  'S-Oil QAS': {
    '1': [
      { name: 'Receiver_Address', value: '${property.L_System_DEST_1}', configuredValue: '${property.L_System_DEST_1}', isRequired: 'false', description: '선택 파라미터 (Optional)' },
      { name: 'Sender_Address', value: '/api/v1/sender', configuredValue: '/api/qas/sender', isRequired: 'true', description: '필수 파라미터 (Required)' }
    ]
  },
  'S-Oil DEV': {
    '1': [
      { name: 'Receiver_Address', value: '${property.L_System_DEST_1}', configuredValue: '${property.L_System_DEST_1}', isRequired: 'false', description: '선택 파라미터 (Optional)' },
      { name: 'Sender_Address', value: '/api/v1/sender', configuredValue: '/api/v1/sender', isRequired: 'true', description: '필수 파라미터 (Required)' }
    ]
  }
};
