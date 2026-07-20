export type FieldKind = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'null';

/** apiService.getParsedModel()이 돌려주는 파싱 모델. 백엔드 스키마가 굳어지기 전이라 any로 둔다. */
export type ParsedModel = Record<string, any>;

export interface SchemaField {
  /** 필드명 (마지막 세그먼트) */
  key: string;
  /** 컨텍스트 루트부터의 전체 경로. 배열은 `[]`로 표시 (예: steps[].mapping.name) — 화면 표시/텍스트 모드 삽입용 */
  fullPath: string;
  /** 가장 가까운 배열 원소를 기준으로 한 상대 경로 (예: mapping.name) — 비주얼 빌더의 filter/value 삽입용 */
  itemPath: string;
  kind: FieldKind;
  /** 이 필드를 감싸는 가장 가까운 배열의 subject 경로 (예: steps). 배열 자신인 경우 자기 경로와 동일 */
  arraySubjectPath?: string;
  children?: SchemaField[];
}

function kindOf(value: unknown): FieldKind {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return 'array';
  switch (typeof value) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'object';
  }
}

/**
 * 파싱 모델 샘플 객체를 순회하며 표현식 작성에 쓸 수 있는 필드 트리를 만든다.
 * 배열을 만나면 첫 원소를 기준으로 자식 필드(item shape)를 구성하고, itemPath를 그 배열 지점부터 다시 센다.
 * (예: steps 배열 안의 type 필드는 filter에서 "type" 만으로 참조하는 기존 UI 컨벤션에 맞춤)
 */
export function buildSchemaTree(sample: Record<string, unknown>): SchemaField[] {
  const walk = (
    obj: Record<string, unknown>,
    fullPrefix: string,
    itemPrefix: string,
    arraySubjectPath: string | undefined
  ): SchemaField[] =>
    Object.entries(obj).map(([key, value]) => {
      const kind = kindOf(value);
      const fullPath = fullPrefix ? `${fullPrefix}.${key}` : key;

      if (kind === 'array') {
        const first = (value as unknown[]).find((v) => v && typeof v === 'object');
        const children = first
          ? walk(first as Record<string, unknown>, `${fullPath}[]`, '', fullPath)
          : undefined;
        return { key, fullPath: `${fullPath}[]`, itemPath: fullPath, kind, arraySubjectPath: fullPath, children };
      }

      const itemPath = itemPrefix ? `${itemPrefix}.${key}` : key;

      if (kind === 'object') {
        const children = walk(value as Record<string, unknown>, fullPath, itemPath, arraySubjectPath);
        return { key, fullPath, itemPath, kind, arraySubjectPath, children };
      }

      return { key, fullPath, itemPath, kind, arraySubjectPath };
    });

  return walk(sample, '', '', undefined);
}

export interface SubjectField {
  /** 비주얼 빌더 subject 값 (예: "steps") */
  path: string;
  /** filter/value에 쓸 수 있는 하위 스칼라 필드 (중첩 배열은 제외) */
  itemFields: { path: string; kind: FieldKind }[];
}

function collectScalarFields(nodes: SchemaField[] | undefined, acc: { path: string; kind: FieldKind }[] = []) {
  for (const n of nodes ?? []) {
    if (n.kind === 'object') {
      collectScalarFields(n.children, acc);
    } else if (n.kind !== 'array') {
      acc.push({ path: n.itemPath, kind: n.kind });
    }
  }
  return acc;
}

/** 트리에서 배열 타입 필드(= 비주얼 빌더의 subject 후보)만 평탄화해서 뽑는다 */
export function collectSubjectFields(tree: SchemaField[]): SubjectField[] {
  const subjects: SubjectField[] = [];
  const visit = (nodes: SchemaField[]) => {
    for (const n of nodes) {
      if (n.kind === 'array') {
        subjects.push({ path: n.arraySubjectPath!, itemFields: collectScalarFields(n.children) });
      } else if (n.kind === 'object') {
        visit(n.children ?? []);
      }
    }
  };
  visit(tree);
  return subjects;
}

/**
 * iflow.* 하위 컬렉션을 루트로 끌어올린 "표현식 평가 컨텍스트"를 만든다.
 * 예: steps.filter(s, s.type == "mapping").size() <= 5 처럼 steps를 루트에서 바로 참조하는 기존 컨벤션에 맞춤.
 */
export function buildExpressionContext(model: ParsedModel) {
  const iflow = model?.iflow ?? {};
  return {
    artifact: model?.artifact,
    config: iflow.config,
    participants: iflow.participants ?? [],
    channels: iflow.channels ?? [],
    processes: iflow.processes ?? [],
    events: iflow.events ?? [],
    gateways: iflow.gateways ?? [],
    sequenceFlows: iflow.sequenceFlows ?? [],
    steps: iflow.steps ?? [],
    exceptionSubprocesses: iflow.exceptionSubprocesses ?? [],
    parameters: model?.parameters ?? [],
    mappings: model?.mappings ?? [],
    schemas: model?.schemas ?? [],
    scripts: model?.scripts ?? []
  };
}

export function getExpressionSchema(model: ParsedModel) {
  const tree = buildSchemaTree(buildExpressionContext(model));
  const subjects = collectSubjectFields(tree);
  return { tree, subjects };
}
