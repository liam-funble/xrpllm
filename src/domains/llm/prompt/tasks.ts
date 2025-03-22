import { isCurrency } from "xrpl/dist/npm/models/transactions/common";
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
    {
        name: "go-to-main",
        parameters: null,
        description: "메인으로 이동합니다."
    },
    {
        name: "go-to-friends",
        parameters: null,
        description: "친구목록으로 이동합니다."
    },
    {
        name: "go-to-friend-detail",
        parameters: {
            friendName: "string",
            address: "string"
        },
        description: "친구 상세 정보로 이동합니다."
    },
    {
        name: "create-offer",
        parameters: {
            currency: "string",
            issuerName: "string",
            ammount: "string",
            xrpAmount: "string",

        },
        description: "DEX에 Offer를 제출합니다."
    },
    {
        name: "error",
        parameters: null,
        description: "미지원 기능입니다."
    }
];