export interface Friend {
    nickname: string;
    address: string;
}

export interface MyInfo {
    nickname: string;
    address: string;
}

export interface GenerateResponseParams {
    prompt: string;
    model?: string;
    friends?: Friend[];
    my?: MyInfo;
}