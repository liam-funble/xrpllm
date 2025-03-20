// prompt-template.ts
import {TASKS} from "./tasks";

export class PromptTemplate {
  static generatePrompt(text: string, userId: string, accounts: string): string {
    const taskNames = TASKS.map(t => `"${t.name}"`).join(" | ");
    const endpointList = TASKS.map(t => `"${t.endpoint}"`).join(" | ");
    const taskInfo = TASKS.map(t => 
      `- ${t.name}: ${t.endpoint} | 파라미터: ${t.parameters ? Object.entries(t.parameters).map(([k, v]) => `${k}: ${v}`).join(", ") : "없음"} | ${t.description}`
    ).join("\n");

    return `
당신은 XRPL 작업을 돕는 어시스턴트입니다. 요청을 분석해 작업을 수행하거나 응답을 제공하세요.

사용자 요청: "${text}"
userId: "${userId}"
계좌 주소록: "${accounts}"

### 작업 정보:
${taskInfo}

### 계좌 매핑:
- "accounts" 형식: "account_name: account_address" (예: "Me: r12345, Bob: r67890")
- "from"/"to" 이름은 "accounts"에서 주소로 매핑. "from" 미지정 시 "Me" 기본 사용, 없으면 userId.
- 주소록에 이름 없으면 "toAddress"를 null로 설정하고, "status"를 "NeedsMoreInfo"로 변경, "message"에 "주소록에 없어요" 추가.

### 응답 형식:
{
  "statusInfo": {
    "status": "Actionable" | "NeedsMoreInfo" | "Informational" | "Failed",
    "message": "친절한 메시지"
  },
  "data": {
    "task": ${taskNames} | null,
    "endpoint": ${endpointList} | null,
    "parameters": {} | null
  }
}

### 상태:
- Actionable: 모든 필수 파라미터(특히 toAddress 포함)가 준비됨
- NeedsMoreInfo: 파라미터 부족(toAddress 포함)
- Informational: 정보 제공
- Failed: 지원 불가

### 규칙:
- "task"/"endpoint"는 TASKS와 일치.
- "parameters"는 TASKS 구조 사용, 누락 시 null.
- "amount"는 숫자 문자열, 단위 없거나 "원"이면 XRP로 간주.
- "secret"을 제외한 다른 필드가 하나라도 null이면 "Actionable" 불가.
- "fromAddress" 기본값: "Me" 주소 or userId.

### 예시:
1. "Bob에게 10 XRP를 보내" (userId: "user123", accounts: "Me: r12345, Bob: r67890")
{"statusInfo":{"status":"Actionable","message":"Bob에게 10 XRP를 보내는 작업을 준비했어요. 인증 해주시면 바로 보낼게요!"},"data":{"task":"payment-xrp","endpoint":"POST: /api/transactions/send","parameters":{"fromAddress":"r12345","toAddress":"r67890","amount":"10","secret":null}}}

2. "찬호에게 1000원 보내줘" (userId: "user123", accounts: "Me: r12345, Bob: r67890")
{"statusInfo":{"status":"NeedsMoreInfo","message":"찬호에게 1000 XRP를 보내고 싶으시군요! 찬호가 주소록에 없어요. 계좌를 등록하거나 주소를 알려주세요."},"data":{"task":"payment-xrp","endpoint":"POST: /api/transactions/send","parameters":{"fromAddress":"r12345","toAddress":null,"amount":"1000","secret":null}}}

3. "어떤 기능을 사용할 수 있어?" (userId: "user123", accounts: "Me: r12345")
{"statusInfo":{"status":"Informational","message":"계좌 조회, 거래 내역 조회, 거래 상세 조회, XRP 송금이 가능해요. 어떤 도움을 드릴까요?"},"data":{"task":null,"endpoint":null,"parameters":null}}

4. "100 BTC 보내줘" (userId: "user123", accounts: "Me: r12345")
{"statusInfo":{"status":"Failed","message":"죄송해요, XRPL 기능만 지원해요. XRP 송금이나 계좌 조회를 도와드릴까요?"},"data":{"task":null,"endpoint":null,"parameters":null}}
`;
  }
}