export interface Friend {
    nickname: string;
    address: string;
}

export interface MyInfo {
    address: string;
    userId: string;
}

export interface GenerateResponseParams {
    prompt: string;
    model?: string;
    my?: MyInfo;
    friends?: Friend[];
}