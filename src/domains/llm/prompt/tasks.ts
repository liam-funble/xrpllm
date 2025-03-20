import {TaskDefinition} from "./task-definition";

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
        name: "get-transaction-history",
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