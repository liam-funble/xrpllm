import {TaskDefinition} from "./task-definition";

export const TASKS: TaskDefinition[] = [
    {
        name: "get-account",
        parameters: {
            address: "string",
        },
        description: "특정 계정의 잔액 및 정보를 조회합니다.",
    },
    {
        name: "payment-xrp",
        parameters: {
            fromAddress: "string",
            toAddress: "string",
            amount: "string"
        },
        description: "XRP를 한 계정에서 다른 계정으로 송금합니다.",
    },
    {
        name: "get-transaction-history",
        parameters: {
            address: "string",
        },
        description: "특정 계정의 거래 내역을 조회합니다.",
    },
    {
        name: "get-transaction-detail",
        parameters: {
            txHash: "string",
        },
        description: "특정 거래의 상세 정보를 조회합니다.",
    },
];