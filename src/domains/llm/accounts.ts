export interface Friend {
    nickname: string;
    address: string;
}

export interface MyInfo {
    address: string;
    userId: string;
}

export interface FT {
    currency: string;
    issuerAddress: string;
    balance: string;
}

export interface GenerateResponseParams {
    prompt: string;
    model?: string;
    my?: MyInfo;
    friends?: Friend[];
    FTs: FT[];
}