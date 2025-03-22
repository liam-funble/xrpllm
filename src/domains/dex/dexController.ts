import { Request, Response } from 'express';
import { DEXService } from './dexService';
import { Client } from 'xrpl';
import { OfferCreateRequest, OfferQueryFilter, OrderBookQuery, OfferCancelRequest } from './DEX';

export class DEXController {
  private dexService: DEXService;

  constructor(client: Client) {
    this.dexService = new DEXService(client);
    console.log('[DEXController] 초기화됨');
  }

  /**
   * 오퍼 생성 API
   * @route POST /api/dex/offer/create
   */
  async createOffer(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] createOffer 호출됨');
    
    try {
      const requestBody: OfferCreateRequest = req.body;
      
      // 필수 파라미터 확인
      if (!requestBody.account) {
        res.status(400).json({
          success: false,
          error: "계정 주소는 필수 파라미터입니다."
        });
        return;
      }
      
      if (!requestBody.takerGets) {
        res.status(400).json({
          success: false,
          error: "takerGets(판매할 통화/금액)는 필수 파라미터입니다."
        });
        return;
      }
      
      if (!requestBody.takerPays) {
        res.status(400).json({
          success: false,
          error: "takerPays(구매할 통화/금액)는 필수 파라미터입니다."
        });
        return;
      }
      
      if (!requestBody.seed) {
        res.status(400).json({
          success: false,
          error: "계정 시드는 필수 파라미터입니다."
        });
        return;
      }
      
      // 통화 유효성 검사
      if (typeof requestBody.takerGets !== 'string') {
        if (!requestBody.takerGets.currency) {
          res.status(400).json({
            success: false,
            error: "takerGets에 통화 코드가 누락되었습니다."
          });
          return;
        }
        
        if (requestBody.takerGets.currency.toUpperCase() !== 'XRP' && !requestBody.takerGets.issuer) {
          res.status(400).json({
            success: false,
            error: "XRP가 아닌 통화의 경우 발행자 주소가 필요합니다."
          });
          return;
        }
        
        if (!requestBody.takerGets.value) {
          res.status(400).json({
            success: false,
            error: "takerGets에 금액이 누락되었습니다."
          });
          return;
        }
      }
      
      if (typeof requestBody.takerPays !== 'string') {
        if (!requestBody.takerPays.currency) {
          res.status(400).json({
            success: false,
            error: "takerPays에 통화 코드가 누락되었습니다."
          });
          return;
        }
        
        if (requestBody.takerPays.currency.toUpperCase() !== 'XRP' && !requestBody.takerPays.issuer) {
          res.status(400).json({
            success: false,
            error: "XRP가 아닌 통화의 경우 발행자 주소가 필요합니다."
          });
          return;
        }
        
        if (!requestBody.takerPays.value) {
          res.status(400).json({
            success: false,
            error: "takerPays에 금액이 누락되었습니다."
          });
          return;
        }
      }
      
      // OfferCreate 서비스 호출
      const result = await this.dexService.createOffer(requestBody);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('[DEXController] 오퍼 생성 중 오류 발생:', error);
      
      res.status(500).json({
        success: false,
        error: error.message || "오퍼 생성 중 서버 오류가 발생했습니다."
      });
    }
  }

  /**
   * 계정의 오퍼 목록 조회 API
   * @route GET /api/dex/offers/:account
   */
  async getAccountOffers(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] getAccountOffers 호출됨');
    
    try {
      const account = req.params.account;
      
      // 계정 주소 검증
      if (!account) {
        res.status(400).json({
          success: false,
          error: "계정 주소는 필수 파라미터입니다."
        });
        return;
      }
      
      // 쿼리 파라미터 파싱
      const filter: OfferQueryFilter = {
        account: account
      };
      
      // 선택적 파라미터
      if (req.query.limit) {
        filter.limit = parseInt(req.query.limit as string);
      }
      
      if (req.query.ledger_index) {
        filter.ledgerIndex = req.query.ledger_index as string;
      }
      
      if (req.query.marker) {
        filter.marker = req.query.marker;
      }
      
      // 서비스 호출
      const result = await this.dexService.getAccountOffers(filter);
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[DEXController] 오퍼 목록 조회 중 오류 발생:', error);
      
      res.status(500).json({
        success: false,
        error: error.message || "오퍼 목록 조회 중 서버 오류가 발생했습니다."
      });
    }
  }

  /**
   * 오더북 조회 API
   * @route GET /api/dex/orderbook
   */
  async getOrderBook(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] getOrderBook 호출됨');
    
    try {
      // 쿼리 파라미터 추출 및 파싱
      const takerGets = this.parseCurrencyFromQueryParam(req.query.taker_gets as string);
      const takerPays = this.parseCurrencyFromQueryParam(req.query.taker_pays as string);
      
      // 필수 파라미터 검증
      if (!takerGets || !takerPays) {
        res.status(400).json({
          success: false,
          error: "taker_gets와 taker_pays는 필수 파라미터입니다. 형식: 'XRP' 또는 'CURRENCY:ISSUER'"
        });
        return;
      }
      
      // OrderBook 쿼리 구성
      const query: OrderBookQuery = {
        takerGets: takerGets,
        takerPays: takerPays
      };
      
      // 선택적 파라미터
      if (req.query.limit) {
        query.limit = parseInt(req.query.limit as string);
      }
      
      if (req.query.taker) {
        query.taker = req.query.taker as string;
      }
      
      // 서비스 호출
      const result = await this.dexService.getOrderBook(query);
      
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[DEXController] 오더북 조회 중 오류 발생:', error);
      
      res.status(500).json({
        success: false,
        error: error.message || "오더북 조회 중 서버 오류가 발생했습니다."
      });
    }
  }

  /**
   * 쿼리 파라미터에서 통화 정보 파싱
   * 형식: 'XRP' 또는 'CURRENCY:ISSUER'
   */
  private parseCurrencyFromQueryParam(param: string): any {
    if (!param) return null;
    
    // XRP 특수 처리
    if (param.toUpperCase() === 'XRP') {
      return {
        currency: 'XRP'
      };
    }
    
    // 다른 통화의 경우 CURRENCY:ISSUER 형식 파싱
    const parts = param.split(':');
    if (parts.length !== 2) {
      throw new Error(`잘못된 통화 형식: ${param}, 'CURRENCY:ISSUER' 형식이어야 합니다.`);
    }
    
    return {
      currency: parts[0],
      issuer: parts[1]
    };
  }

  /**
   * 오퍼 취소 API
   * @route POST /api/dex/offer/cancel
   */
  async cancelOffer(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] cancelOffer 호출됨');
    
    try {
      const requestBody: OfferCancelRequest = req.body;
      
      // 필수 파라미터 확인
      if (!requestBody.account) {
        res.status(400).json({
          success: false,
          error: "계정 주소는 필수 파라미터입니다."
        });
        return;
      }
      
      if (!requestBody.offerSequence) {
        res.status(400).json({
          success: false,
          error: "취소할 오퍼의 시퀀스 번호는 필수 파라미터입니다."
        });
        return;
      }
      
      if (!requestBody.seed) {
        res.status(400).json({
          success: false,
          error: "계정 시드는 필수 파라미터입니다."
        });
        return;
      }
      
      // OfferCancel 서비스 호출
      const result = await this.dexService.cancelOffer(requestBody);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error: any) {
      console.error('[DEXController] 오퍼 취소 중 오류 발생:', error);
      
      res.status(500).json({
        success: false,
        error: error.message || "오퍼 취소 중 서버 오류가 발생했습니다."
      });
    }
  }

  /**
   * 오퍼 상태 확인 API
   * @route GET /api/dex/offer/status/:account/:sequence
   */
  async checkOfferStatus(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] checkOfferStatus 호출됨');
    
    try {
      const account = req.params.account;
      const offerSequence = parseInt(req.params.sequence);
      
      if (!account) {
        res.status(400).json({
          success: false,
          error: "계정 주소는 필수 파라미터입니다."
        });
        return;
      }
      
      if (isNaN(offerSequence)) {
        res.status(400).json({
          success: false,
          error: "유효한 오퍼 시퀀스 번호가 필요합니다."
        });
        return;
      }
      
      const result = await this.dexService.checkOfferStatus(account, offerSequence);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[DEXController] 오퍼 상태 확인 중 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || "오퍼 상태 확인 중 서버 오류가 발생했습니다."
      });
    }
  }

  /**
   * 오퍼 히스토리 조회 API
   * @route GET /api/dex/offer/history/:account/:sequence
   */
  async getOfferHistory(req: Request, res: Response): Promise<void> {
    console.log('[DEXController] getOfferHistory 호출됨');
    
    try {
      const account = req.params.account;
      const offerSequence = parseInt(req.params.sequence);
      
      if (!account) {
        res.status(400).json({
          success: false,
          error: "계정 주소는 필수 파라미터입니다."
        });
        return;
      }
      
      if (isNaN(offerSequence)) {
        res.status(400).json({
          success: false,
          error: "유효한 오퍼 시퀀스 번호가 필요합니다."
        });
        return;
      }
      
      const result = await this.dexService.getOfferHistory(account, offerSequence);
      res.status(200).json(result);
    } catch (error: any) {
      console.error('[DEXController] 오퍼 히스토리 조회 중 오류:', error);
      res.status(500).json({
        success: false,
        error: error.message || "오퍼 히스토리 조회 중 서버 오류가 발생했습니다."
      });
    }
  }
} 