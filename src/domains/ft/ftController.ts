import { Request, Response } from 'express';
import { Client, Wallet } from 'xrpl';
import { FTService } from './ftService';
import { FT, validateFT, TrustLineSettings, AccountSetOptions } from './FT';

export class FTController {
  private ftService: FTService;
  private client: Client;

  constructor(client: Client) {
    this.client = client;
    this.ftService = new FTService(client);
  }

  async issueFT(req: Request, res: Response): Promise<Response> {
    try {
      const { ft, secret } = req.body;
      
      // 입력 데이터 유효성 검사
      const validatedFT = validateFT(ft);
      
      // 월렛 생성
      const wallet = Wallet.fromSeed(secret);
      
      // FT 발행
      const result = await this.ftService.issueFT(validatedFT, wallet);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("FT 발행 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }

  async getFTsByIssuer(req: Request, res: Response): Promise<Response> {
    try {
      const { issuerAddress } = req.params;
      
      const result = await this.ftService.getFTsByIssuer(issuerAddress);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("FT 목록 조회 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }

  async transferFT(req: Request, res: Response): Promise<Response> {
    try {
      const { secret, receiverAddress, currency, issuer, amount } = req.body;
      
      // 월렛 생성
      const wallet = Wallet.fromSeed(secret);
      
      // FT 전송
      const result = await this.ftService.transferFT(wallet, receiverAddress, currency, issuer, amount);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("FT 전송 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }

  /**
   * Trustline 설정
   */
  async setTrustLine(req: Request, res: Response): Promise<Response> {
    try {
      const { account, issuer, currency, limit, qualityIn, qualityOut, ripplingDisabled, noRipple, freezeEnabled, secret } = req.body;
      
      if (!account || !issuer || !currency || !limit || !secret) {
        return res.status(400).json({ 
          error: "필수 파라미터가 누락되었습니다 (account, issuer, currency, limit, secret 필수)" 
        });
      }
      
      // TrustLine 설정 객체 생성
      const trustLineSettings: TrustLineSettings = {
        account,
        issuer,
        currency,
        limit,
        qualityIn,
        qualityOut,
        ripplingDisabled,
        noRipple,
        freezeEnabled
      };
      
      // 월렛 생성
      const wallet = Wallet.fromSeed(secret);
      
      // 계정과 지갑 주소가 일치하는지 확인
      if (wallet.address !== account) {
        return res.status(400).json({ 
          error: "제공된 시크릿(secret)에 해당하는 지갑 주소가 account 파라미터와 일치하지 않습니다." 
        });
      }
      
      // Trustline 설정 실행
      const result = await this.ftService.setTrustLine(trustLineSettings, wallet);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Trustline 설정 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }
  
  /**
   * Trustline 조회
   */
  async getTrustLines(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const { currency, issuer } = req.query;
      
      if (!address) {
        return res.status(400).json({ error: "주소(address)는 필수 파라미터입니다." });
      }
      
      // 옵셔널 파라미터 처리
      const options: any = {};
      if (currency) options.currency = currency as string;
      if (issuer) options.issuer = issuer as string;
      
      // Trustline 조회 실행
      const result = await this.ftService.getTrustLines(address, options);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Trustline 조회 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }

  /**
   * 계정의 DefaultRipple 설정
   */
  async setAccountOptions(req: Request, res: Response): Promise<Response> {
    try {
      const { account, defaultRipple, requireDest, requireAuth, disallowXRP, 
              transferRate, domain, emailHash, messageKey, tickSize, seed } = req.body;
      
      if (!account || !seed) {
        return res.status(400).json({ 
          error: "필수 파라미터가 누락되었습니다 (account, seed 필수)" 
        });
      }
      
      // AccountSet 옵션 객체 생성
      const accountOptions: AccountSetOptions = {
        account,
        defaultRipple,
        requireDest,
        requireAuth,
        disallowXRP,
        transferRate,
        domain,
        emailHash,
        messageKey,
        tickSize
      };
      
      // 월렛 생성
      const wallet = Wallet.fromSeed(seed);
      
      // 계정과 지갑 주소가 일치하는지 확인
      if (wallet.address !== account) {
        return res.status(400).json({ 
          error: "제공된 시드(seed)에 해당하는 지갑 주소가 account 파라미터와 일치하지 않습니다." 
        });
      }
      
      // 계정 설정 변경 실행
      const result = await this.ftService.setAccountOptions(accountOptions, wallet);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("계정 설정 변경 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }
  
  /**
   * TrustLine의 NoRipple 설정 변경
   */
  async setTrustLineNoRipple(req: Request, res: Response): Promise<Response> {
    try {
      const { account, issuer, currency, limit, qualityIn, qualityOut, noRipple, seed } = req.body;
      
      if (!account || !issuer || !currency || !seed) {
        return res.status(400).json({ 
          error: "필수 파라미터가 누락되었습니다 (account, issuer, currency, seed 필수)" 
        });
      }
      
      // TrustLine 설정 객체 생성
      const trustLineSettings: TrustLineSettings = {
        account,
        issuer,
        currency,
        limit: limit || "0", // 기본값 설정
        qualityIn,
        qualityOut,
        noRipple
      };
      
      // 월렛 생성
      const wallet = Wallet.fromSeed(seed);
      
      // 계정과 지갑 주소가 일치하는지 확인
      if (wallet.address !== account) {
        return res.status(400).json({ 
          error: "제공된 시드(seed)에 해당하는 지갑 주소가 account 파라미터와 일치하지 않습니다." 
        });
      }
      
      // TrustLine NoRipple 설정 변경 실행
      const result = await this.ftService.setTrustLineNoRipple(trustLineSettings, wallet);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("TrustLine NoRipple 설정 변경 컨트롤러 오류:", error);
      return res.status(400).json({ error: error.message || '알 수 없는 오류가 발생했습니다.' });
    }
  }
}