export interface TaskDefinition {
    name: string;
    endpoint: string;
    parameters: Record<string, string> | null; // 파라미터 이름과 타입 설명
    description: string;
}