export interface TaskDefinition {
    name: string;
    // endpoint: string;
    parameters: Record<string, string> | null;
    description: string;
}