export interface NFTMintRequest {
  issuerAddress: string;
  secret: string;
  uri: string;
  flags?: number;
  transferFee?: number;
  taxon?: number;
}

export interface NFTMintResponse {
  success: boolean;
  message?: string;
  nft?: {
    tokenId: string;
    issuer: string;
    uri: string;
    flags: number;
    transferFee?: number;
    taxon: number;
  };
} 