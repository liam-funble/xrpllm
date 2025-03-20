import { Client, Wallet, convertStringToHex } from 'xrpl';
import { NFTMintRequest, NFTMintResponse } from './NFT';

export class NFTService {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async mintNFT(request: NFTMintRequest): Promise<NFTMintResponse> {
    try {
      const wallet = Wallet.fromSeed(request.secret);
      
      // URI를 16진수로 변환
      const uriHex = convertStringToHex(request.uri);
      
      // NFTokenMint 트랜잭션 준비
      const prepared = await this.client.autofill({
        TransactionType: 'NFTokenMint',
        Account: request.issuerAddress,
        URI: uriHex,
        Flags: request.flags || 0,
        TransferFee: request.transferFee || 0,
        NFTokenTaxon: request.taxon || 0
      });

      // 트랜잭션 서명
      const signed = wallet.sign(prepared);
      
      // 트랜잭션 제출 및 결과 대기
      const result = await this.client.submitAndWait(signed.tx_blob);

      // 트랜잭션 결과 확인
      const meta = result.result.meta as any;
      const isSuccess = meta?.TransactionResult === 'tesSUCCESS';

      if (!isSuccess) {
        return {
          success: false,
          message: `Transaction failed: ${meta?.TransactionResult || 'Unknown error'}`
        };
      }

      // NFT 토큰 ID 추출
      const nfTokenID = meta?.NFTokenID;

      return {
        success: true,
        nft: {
          tokenId: nfTokenID,
          issuer: request.issuerAddress,
          uri: request.uri,
          flags: request.flags || 0,
          transferFee: request.transferFee,
          taxon: request.taxon || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 