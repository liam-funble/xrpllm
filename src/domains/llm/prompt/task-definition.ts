export interface TaskDefinition {
    name: string;
    parameters: Record<string, string> | null;
    description: string;
}