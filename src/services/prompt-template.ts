// prompt-template.ts
export interface TaskDefinition {
  name: string;
  endpoint: string;
  parameters: Record<string, string> | null; // 파라미터 이름과 타입 설명
  description: string;
}

export const TASKS: TaskDefinition[] = [
  {
    name: "create-account",
    endpoint: "POST: /api/accounts/create",
    parameters: null,
    description: "새로운 XRPL 계정을 생성합니다. 추가 파라미터 필요 없음.",
  },
  {
    name: "get-account",
    endpoint: "GET: /api/accounts/{address}",
    parameters: {
      address: "string",
    },
    description: "특정 계정의 잔액 및 정보를 조회합니다.",
  },
  {
    name: "payment-xrp",
    endpoint: "POST: /api/transactions/send",
    parameters: {
      fromAddress: "string",
      toAddress: "string",
      amount: "string",
      secret: "string",
    },
    description: "XRP를 한 계정에서 다른 계정으로 송금합니다.",
  },
  {
    name: "get-transactions",
    endpoint: "GET: /api/transactions/history/{address}",
    parameters: {
      address: "string",
    },
    description: "특정 계정의 거래 내역을 조회합니다.",
  },
  {
    name: "get-trasaction-detail",
    endpoint: "GET: /api/transactions/{hash}",
    parameters: {
      txHash: "string",
    },
    description: "특정 거래의 상세 정보를 조회합니다.",
  },
];

export class PromptTemplate {
  static generatePrompt(text: string, userId: string): string {
    const taskList = TASKS.map((task, index) => `${index + 1}. ${task.name}`).join("\n");
    const taskDetails = TASKS.map(
      (task) => `
  - 작업: ${task.name}
  - 엔드포인트: ${task.endpoint}
  - 파라미터: ${
    task.parameters
      ? Object.entries(task.parameters)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : "없음"
  }
  - 설명: ${task.description}`
    ).join("\n");

    const taskNames = TASKS.map((task) => `"${task.name}"`).join(" | ");
    const endpointList = TASKS.map((task) => `"${task.endpoint}"`).join(" | ");

    return `
당신은 XRPL(XRP Ledger) 작업을 도와주는 어시스턴트입니다.
다음 텍스트를 분석하여 XRPL 관련 작업을 수행하거나 적절한 응답을 제공해주세요.

사용 가능한 작업:
${taskList}

작업 상세 정보:
${taskDetails}

사용자 요청: "${text}"
요청자 userId: "${userId}"

응답 형식:
- 모든 응답은 JSON 형식으로 출력하세요.
- 상태정보와 데이터를 아래 구조로 반환하세요:
{
  "statusInfo": {
    "status": "success" | "partial" | "fail",
    "description": "작업 상태에 대한 설명"
  },
  "data": {
    "task": ${taskNames} | null,
    "endpoint": ${endpointList} | null,
    "parameters": {
      // 선택된 작업의 파라미터 구조를 TASKS에서 참조하여 키-값 쌍으로 제공
      // 예: "address": "r123...", "fromAddress": "r456...", 등
    } | null
  }
}

응답 규칙:
- 작업이 명확한 경우: "status": "success", TASKS에서 해당 작업의 task, endpoint, parameters 구조를 참조하여 데이터 제공
- 작업이 확인되었으나 필수 데이터가 누락된 경우: "status": "partial", TASKS에서 필요한 파라미터 중 누락된 항목 명시
- 작업이 불명확한 경우: "status": "fail", 가능한 작업 목록 제시 및 추가 정보 요청
- 오류나 제한사항이 있는 경우: "status": "fail", 이유와 대안 제시

추가 지침:
- "task"는 TASKS에 정의된 이름 중 하나만 사용 가능
- "endpoint"는 선택된 작업의 TASKS에 정의된 엔드포인트와 일치해야 함
- "parameters"는 TASKS에 정의된 파라미터 구조를 기반으로 채워야 하며, 값이 누락된 경우 null로 설정
- "amount"는 숫자 문자열이어야 하며, 단위가 명시되지 않은 경우 XRP로 간주
- "address", "fromAddress", "toAddress"가 이름(예: "Bob")으로 제공된 경우, 백엔드에서 매핑 필요
- 요청자 userId를 기반으로 "fromAddress" 또는 "address"를 기본값으로 사용할 수 있음
`;
  }
}

export default PromptTemplate;