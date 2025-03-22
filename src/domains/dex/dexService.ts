import { Client, Wallet, xrpToDrops, dropsToXrp } from 'xrpl';
import { 
  OfferCreateRequest, 
  OfferQueryFilter, 
  OrderBookQuery,
  OfferCancelRequest
} from './DEX';

export class DEXService {
  private client: Client;
  private txTracker = new Map<string, number>(); // 트랜잭션 추적용 맵

  constructor(client: Client) {
    this.client = client;
    console.log('[DEXService] 초기화됨');
  }

  /**
   * 현재 네트워크 수수료 정보를 가져옴
   * @returns 권장 수수료 (drops 단위)
   */
  private async getFeeRecommendation(): Promise<string> {
    console.log('[DEXService] 네트워크 수수료 정보 요청 중...');
    
    try {
      const feeResult = await this.client.request({
        command: "fee"
      });
      
      // 다양한 수수료 레벨 중 선택 (open, medium, high)
      const openFee = feeResult.result.drops.open_ledger_fee;
      const mediumFee = feeResult.result.drops.median_fee;
      const highFee = feeResult.result.drops.minimum_fee;
      
      // 현재 네트워크 부하에 따라 적절한 수수료 선택
      // 일반적으로 median_fee는 중간 정도의 우선순위를 가짐
      const recommendedFee = mediumFee;
      
      console.log(`[DEXService] 수수료 정보 - 낮음: ${highFee}, 중간: ${mediumFee}, 높음: ${openFee}`);
      console.log(`[DEXService] 권장 수수료: ${recommendedFee} drops (${dropsToXrp(recommendedFee)} XRP)`);
      
      // 최소 수수료보다 작지 않도록 확인
      return recommendedFee > highFee ? recommendedFee : highFee;
    } catch (error) {
      console.error('[DEXService] 수수료 정보 요청 실패, 기본값 사용:', error);
      // 기본 수수료 반환 (10 drops)
      return xrpToDrops("0.00001");
    }
  }

  /**
   * 화폐 코드 형식 검증 및 변환
   * @param currencyCode 원본 화폐 코드
   * @returns 유효한 XRPL 화폐 코드
   */
  private validateCurrencyCode(currencyCode: string): string {
    console.log(`[DEXService] 화폐 코드 검증: "${currencyCode}"`);
    
    // XRP 특수 처리
    if (currencyCode.toUpperCase() === 'XRP') {
      return 'XRP';
    }
    
    // 3글자 ISO 표준 코드인 경우
    if (currencyCode.length === 3) {
      console.log(`[DEXService] 3글자 ISO 코드 사용: ${currencyCode}`);
      return currencyCode;
    }
    
    // 이미 40자 16진수인 경우
    if (currencyCode.length === 40 && /^[0-9A-F]+$/i.test(currencyCode)) {
      console.log(`[DEXService] 40자 16진수 코드 사용: ${currencyCode}`);
      return currencyCode;
    }
    
    // 3글자가 아닌 경우 16진수로 변환 후 40자로 패딩
    console.log(`[DEXService] 화폐 코드 변환 필요: ${currencyCode} (현재 ${currencyCode.length}글자)`);
    
    // 문자열을 16진수로 변환
    let hexCode = Buffer.from(currencyCode, 'utf8').toString('hex').toUpperCase();
    
    // 40자에 맞게 패딩 (앞에 0으로 채움)
    while (hexCode.length < 40) {
      hexCode = '0' + hexCode;
    }
    
    // 40자를 초과하면 앞에서부터 40자만 사용
    if (hexCode.length > 40) {
      hexCode = hexCode.substring(0, 40);
    }
    
    console.log(`[DEXService] 변환된 화폐 코드: ${hexCode}`);
    return hexCode;
  }

  /**
   * 오퍼 생성 (OfferCreate)
   * XRP Ledger의 내장 DEX에 거래 제안 생성
   */
  async createOffer(request: OfferCreateRequest): Promise<any> {
    console.log('[DEXService] createOffer 호출됨', {
      account: request.account,
      takerGets: request.takerGets,
      takerPays: request.takerPays
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[DEXService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[DEXService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[DEXService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[DEXService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[DEXService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 계정 정보 및 시퀀스 번호 가져오기
      console.log(`[DEXService] 계정 정보 요청 중... (주소: ${request.account})`);
      const wallet = Wallet.fromSeed(request.seed);
      
      // 월렛 주소와 요청 계정 일치 확인
      if (wallet.address !== request.account) {
        throw new Error("시드에서 생성된 주소가 요청 계정 주소와 일치하지 않습니다.");
      }
      
      const accountInfo = await this.client.request({
        command: "account_info",
        account: request.account
      });
      
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[DEXService] 계정 시퀀스 번호: ${sequence}`);

      // TakerGets와 TakerPays 처리
      let takerGets: any;
      let takerPays: any;
      
      // TakerGets 처리 (판매할 통화)
      if (typeof request.takerGets === 'string') {
        // XRP인 경우
        takerGets = xrpToDrops(request.takerGets);
        console.log(`[DEXService] TakerGets: ${request.takerGets} XRP (${takerGets} drops)`);
      } else {
        // 다른 통화인 경우
        const currency = this.validateCurrencyCode(request.takerGets.currency);
        takerGets = {
          currency: currency,
          issuer: request.takerGets.issuer,
          value: request.takerGets.value
        };
        console.log(`[DEXService] TakerGets: ${JSON.stringify(takerGets)}`);
      }
      
      // TakerPays 처리 (구매할 통화)
      if (typeof request.takerPays === 'string') {
        // XRP인 경우
        takerPays = xrpToDrops(request.takerPays);
        console.log(`[DEXService] TakerPays: ${request.takerPays} XRP (${takerPays} drops)`);
      } else {
        // 다른 통화인 경우
        const currency = this.validateCurrencyCode(request.takerPays.currency);
        takerPays = {
          currency: currency,
          issuer: request.takerPays.issuer,
          value: request.takerPays.value
        };
        console.log(`[DEXService] TakerPays: ${JSON.stringify(takerPays)}`);
      }
      
      // 플래그 계산
      let flags = 0;
      if (request.passive === true) {
        flags |= 0x00010000; // tfPassive
        console.log('[DEXService] Passive 플래그 설정됨');
      }
      if (request.immediateOrCancel === true) {
        flags |= 0x00020000; // tfImmediateOrCancel
        console.log('[DEXService] ImmediateOrCancel 플래그 설정됨');
      }
      if (request.fillOrKill === true) {
        flags |= 0x00040000; // tfFillOrKill
        console.log('[DEXService] FillOrKill 플래그 설정됨');
      }

      // OfferCreate 트랜잭션 구성
      console.log('[DEXService] OfferCreate 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "OfferCreate",
        Account: request.account,
        TakerGets: takerGets,
        TakerPays: takerPays,
        Fee: networkFee,
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence,
        Flags: flags
      };
      
      // 선택적 필드 추가
      if (request.expiration) {
        tx.Expiration = request.expiration;
        console.log(`[DEXService] 만료 시간 설정: ${request.expiration}`);
      }
      
      if (request.offerSequence) {
        tx.OfferSequence = request.offerSequence;
        console.log(`[DEXService] 대체할 오퍼 시퀀스: ${request.offerSequence}`);
      }
      
      console.log('[DEXService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[DEXService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[DEXService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[DEXService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[DEXService] 오퍼 생성 성공!`);
        
        // 생성된 오퍼 시퀀스 번호 찾기
        let offerSequence = null;
        try {
          const meta = result.result.meta;
          if (meta.AffectedNodes) {
            for (const node of meta.AffectedNodes) {
              if (node.CreatedNode && node.CreatedNode.LedgerEntryType === 'Offer') {
                // 방법 1: NewFields.Sequence에서 시퀀스 가져오기
                if (node.CreatedNode.NewFields && node.CreatedNode.NewFields.Sequence) {
                  offerSequence = node.CreatedNode.NewFields.Sequence;
                  console.log(`[DEXService] 생성된 오퍼 시퀀스: ${offerSequence}`);
                  break;
                }
                
                // 방법 2: LedgerIndex에서 추출 시도 (기존 방식 백업)
                else if (node.CreatedNode.LedgerIndex && node.CreatedNode.LedgerIndex.includes(':')) {
                  offerSequence = node.CreatedNode.LedgerIndex.split(':')[2];
                  console.log(`[DEXService] 생성된 오퍼 시퀀스(LedgerIndex에서): ${offerSequence}`);
                  break;
                }
              }
            }
          }
          
          // 위 방법으로 못 찾았을 경우, 트랜잭션 자체의 Sequence 사용
          if (!offerSequence && result.result.Sequence) {
            offerSequence = result.result.Sequence;
            console.log(`[DEXService] 오퍼 시퀀스(트랜잭션 Sequence 사용): ${offerSequence}`);
          }
        } catch (e) {
          console.warn('[DEXService] 오퍼 시퀀스 추출 실패:', e);
          console.warn('[DEXService] 오류 세부정보:', e instanceof Error ? e.message : String(e));
        }
        
        return {
          success: true,
          result: result,
          account: request.account,
          offerSequence: offerSequence,
          takerGets: request.takerGets,
          takerPays: request.takerPays,
          transactionResult: txResult
        };
      } else {
        console.error(`[DEXService] 오퍼 생성 실패: ${txResult}`);
        
        return {
          success: false,
          error: `트랜잭션이 실패했습니다: ${txResult}`,
          transactionResult: txResult,
          result: result
        };
      }
    } catch (error: any) {
      console.error("[DEXService] 오퍼 생성 중 오류 발생:", error);
      console.error("[DEXService] 오류 메시지:", error?.message);
      console.error("[DEXService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      throw new Error(error?.message || '오퍼 생성 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[DEXService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[DEXService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 계정의 오퍼 목록 조회
   */
  async getAccountOffers(filter: OfferQueryFilter): Promise<any> {
    console.log('[DEXService] getAccountOffers 호출됨', filter);
    
    let shouldDisconnect = false;
    
    try {
      console.log('[DEXService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[DEXService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[DEXService] XRPL 연결 성공');
      }
      
      // 필수 파라미터 확인
      if (!filter.account) {
        throw new Error("계정 주소는 필수 파라미터입니다.");
      }
      
      // account_offers 요청 구성
      const request: any = {
        command: "account_offers",
        account: filter.account
      };
      
      // 선택적 파라미터 추가
      if (filter.limit) {
        request.limit = filter.limit;
      }
      
      if (filter.ledgerIndex) {
        request.ledger_index = filter.ledgerIndex;
      } else {
        request.ledger_index = "validated";
      }
      
      if (filter.marker) {
        request.marker = filter.marker;
      }
      
      console.log('[DEXService] account_offers 요청 중...', request);
      const response = await this.client.request(request);
      
      const result = response.result as any; // 명시적 타입 캐스팅
      
      console.log(`[DEXService] 오퍼 조회 성공, 결과 ${result.offers?.length || 0}개`);
      return {
        success: true,
        account: filter.account,
        offers: result.offers || [],
        ledger_index: result.ledger_current_index,
        ledger_hash: result.ledger_hash,
        marker: result.marker
      };
    } catch (error: any) {
      console.error("[DEXService] 오퍼 조회 중 오류 발생:", error);
      console.error("[DEXService] 오류 메시지:", error?.message);
      
      throw new Error(error?.message || '오퍼 조회 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[DEXService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[DEXService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 오더북 조회
   */
  async getOrderBook(query: OrderBookQuery): Promise<any> {
    console.log('[DEXService] getOrderBook 호출됨', query);
    
    let shouldDisconnect = false;
    
    try {
      console.log('[DEXService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[DEXService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[DEXService] XRPL 연결 성공');
      }
      
      // 필수 파라미터 확인
      if (!query.takerGets || !query.takerPays) {
        throw new Error("takerGets와 takerPays는 필수 파라미터입니다.");
      }
      
      // TakerGets 처리 (판매할 통화)
      const taker_gets: any = {
        currency: this.validateCurrencyCode(query.takerGets.currency)
      };
      
      if (taker_gets.currency !== 'XRP') {
        taker_gets.issuer = query.takerGets.issuer;
      }
      
      // TakerPays 처리 (구매할 통화)
      const taker_pays: any = {
        currency: this.validateCurrencyCode(query.takerPays.currency)
      };
      
      if (taker_pays.currency !== 'XRP') {
        taker_pays.issuer = query.takerPays.issuer;
      }
      
      // book_offers 요청 구성
      const request: any = {
        command: "book_offers",
        taker_gets: taker_gets,
        taker_pays: taker_pays,
        ledger_index: "validated"
      };
      
      // 선택적 파라미터 추가
      if (query.limit) {
        request.limit = query.limit;
      }
      
      if (query.taker) {
        request.taker = query.taker;
      }
      
      console.log('[DEXService] book_offers 요청 중...', request);
      const response = await this.client.request(request);
      
      const result = response.result as any; // 명시적 타입 캐스팅
      
      console.log(`[DEXService] 오더북 조회 성공, 결과 ${result.offers?.length || 0}개`);
      return {
        success: true,
        offers: result.offers || [],
        ledger_index: result.ledger_current_index,
        ledger_hash: result.ledger_hash
      };
    } catch (error: any) {
      console.error("[DEXService] 오더북 조회 중 오류 발생:", error);
      console.error("[DEXService] 오류 메시지:", error?.message);
      
      throw new Error(error?.message || '오더북 조회 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[DEXService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[DEXService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 오퍼 취소
   */
  async cancelOffer(request: OfferCancelRequest): Promise<any> {
    console.log('[DEXService] cancelOffer 호출됨', {
      account: request.account,
      offerSequence: request.offerSequence
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[DEXService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[DEXService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[DEXService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[DEXService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[DEXService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 계정 정보 및 시퀀스 번호 가져오기
      console.log(`[DEXService] 계정 정보 요청 중... (주소: ${request.account})`);
      const wallet = Wallet.fromSeed(request.seed);
      
      // 월렛 주소와 요청 계정 일치 확인
      if (wallet.address !== request.account) {
        throw new Error("시드에서 생성된 주소가 요청 계정 주소와 일치하지 않습니다.");
      }
      
      const accountInfo = await this.client.request({
        command: "account_info",
        account: request.account
      });
      
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[DEXService] 계정 시퀀스 번호: ${sequence}`);

      // OfferCancel 트랜잭션 구성
      console.log('[DEXService] OfferCancel 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "OfferCancel",
        Account: request.account,
        OfferSequence: request.offerSequence,
        Fee: networkFee,
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence
      };
      
      console.log('[DEXService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[DEXService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[DEXService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[DEXService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[DEXService] 오퍼 취소 성공!`);
        return {
          success: true,
          result: result,
          account: request.account,
          offerSequence: request.offerSequence,
          transactionResult: txResult
        };
      } else {
        console.error(`[DEXService] 오퍼 취소 실패: ${txResult}`);
        
        return {
          success: false,
          error: `트랜잭션이 실패했습니다: ${txResult}`,
          transactionResult: txResult,
          result: result
        };
      }
    } catch (error: any) {
      console.error("[DEXService] 오퍼 취소 중 오류 발생:", error);
      console.error("[DEXService] 오류 메시지:", error?.message);
      console.error("[DEXService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      throw new Error(error?.message || '오퍼 취소 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[DEXService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[DEXService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 특정 오퍼가 여전히 활성 상태인지 확인
   */
  async checkOfferStatus(account: string, offerSequence: number): Promise<any> {
    console.log(`[DEXService] 오퍼 상태 확인 - 계정: ${account}, 오퍼 시퀀스: ${offerSequence}`);
    
    let shouldDisconnect = false;
    
    try {
      // 클라이언트 연결 확인
      if (!this.client.isConnected()) {
        await this.client.connect();
        shouldDisconnect = true;
      }
      
      // 계정의 모든 오퍼 조회
      const request = {
        command: "account_offers",
        account: account,
        ledger_index: "validated"
      };
      
      const response = await this.client.request(request);
      const result = response.result as any;
      const offers = result.offers || [];
      
      // 지정된 시퀀스 번호의 오퍼 찾기
      const matchingOffer = offers.find((offer: any) => offer.seq === offerSequence);
      
      if (matchingOffer) {
        console.log(`[DEXService] 오퍼가 아직 활성 상태입니다 - 시퀀스: ${offerSequence}`);
        return {
          exists: true,
          status: "active",
          offer: matchingOffer
        };
      } else {
        console.log(`[DEXService] 오퍼가 활성 상태가 아닙니다 - 시퀀스: ${offerSequence}`);
        return {
          exists: false,
          status: "inactive", // 체결 완료, 취소, 또는 만료됨
          message: "오퍼가 활성 목록에 없습니다. 체결, 취소 또는 만료되었을 수 있습니다."
        };
      }
    } catch (error: any) {
      console.error("[DEXService] 오퍼 상태 확인 중 오류:", error);
      throw new Error(error?.message || "오퍼 상태 확인 중 오류가 발생했습니다.");
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          await this.client.disconnect();
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 오퍼 관련 거래 히스토리 조회
   */
  async getOfferHistory(account: string, offerSequence: number): Promise<any> {
    console.log(`[DEXService] 오퍼 히스토리 조회 - 계정: ${account}, 오퍼 시퀀스: ${offerSequence}`);
    
    let shouldDisconnect = false;
    
    try {
      // 클라이언트 연결 확인
      if (!this.client.isConnected()) {
        await this.client.connect();
        shouldDisconnect = true;
      }
      
      // 계정 트랜잭션 히스토리 조회
      const request = {
        command: "account_tx",
        account: account,
        ledger_index_min: -1,
        ledger_index_max: -1,
        binary: false,
        limit: 20,
        forward: false
      };
      
      const response = await this.client.request(request);
      const result = response.result as any;
      const transactions = result.transactions || [];
      
      // 오퍼 생성, 취소, 체결 관련 트랜잭션 필터링
      const relevantTxs = transactions.filter((tx: any) => {
        // OfferCreate 또는 OfferCancel 트랜잭션 중에서
        if (tx.tx.TransactionType === "OfferCreate" || tx.tx.TransactionType === "OfferCancel") {
          // 해당 오퍼 시퀀스를 참조하는 경우
          if (tx.tx.OfferSequence === offerSequence) return true;
          if (tx.tx.Sequence === offerSequence) return true;
          
          // 메타데이터에서 해당 오퍼가 영향을 받았는지 확인
          if (tx.meta && tx.meta.AffectedNodes) {
            return tx.meta.AffectedNodes.some((node: any) => {
              if (node.DeletedNode && node.DeletedNode.LedgerEntryType === "Offer") {
                const index = node.DeletedNode.LedgerIndex;
                // 오퍼 시퀀스가 포함된 인덱스 확인
                return index && index.includes(`:${offerSequence}`);
              }
              return false;
            });
          }
        }
        return false;
      });
      
      // 결과 분석
      if (relevantTxs.length > 0) {
        // 체결 관련 정보 추출
        const offerDetails = relevantTxs.map((tx: any) => {
          const result = {
            date: new Date(this.rippleTimeToUnixTime(tx.tx.date)).toISOString(),
            type: tx.tx.TransactionType,
            hash: tx.tx.hash,
            result: tx.meta.TransactionResult,
            executed: tx.meta.TransactionResult === "tesSUCCESS"
          };
          
          // 체결 분석 (메타데이터의 AffectedNodes에서 실제 거래량 파악)
          const exchangeDetails = this.analyzeExchange(tx.meta.AffectedNodes, account);
          if (exchangeDetails) {
            return { ...result, exchange: exchangeDetails };
          }
          
          return result;
        });
        
        return {
          success: true,
          account,
          offerSequence,
          transactions: offerDetails
        };
      } else {
        return {
          success: true,
          account,
          offerSequence,
          message: "해당 오퍼와 관련된 트랜잭션을 찾을 수 없습니다.",
          transactions: []
        };
      }
    } catch (error: any) {
      console.error("[DEXService] 오퍼 히스토리 조회 중 오류:", error);
      throw new Error(error?.message || "오퍼 히스토리 조회 중 오류가 발생했습니다.");
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          await this.client.disconnect();
        } catch (err) {
          console.error("[DEXService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 체결 내용 분석 (메타데이터에서 실제 거래량 파악)
   */
  private analyzeExchange(affectedNodes: any[], account: string): any {
    if (!affectedNodes) return null;
    
    let delivered = null;
    let received = null;
    
    // 계정의 잔액 변경 항목 찾기
    for (const node of affectedNodes) {
      // 잔액 변경 확인
      if (node.ModifiedNode && node.ModifiedNode.LedgerEntryType === "AccountRoot" && 
          node.ModifiedNode.FinalFields.Account === account) {
        // XRP 잔액 변경 확인
        const prevBalance = node.ModifiedNode.PreviousFields.Balance;
        const finalBalance = node.ModifiedNode.FinalFields.Balance;
        
        if (prevBalance && finalBalance) {
          const balanceDiff = (parseInt(finalBalance) - parseInt(prevBalance)) / 1000000; // drops to XRP
          if (balanceDiff > 0) {
            received = { currency: "XRP", value: balanceDiff.toString() };
          } else if (balanceDiff < 0) {
            delivered = { currency: "XRP", value: (-balanceDiff).toString() };
          }
        }
      }
      
      // 트러스트라인 잔액 변경 확인 (다른 통화)
      if (node.ModifiedNode && node.ModifiedNode.LedgerEntryType === "RippleState") {
        const fields = node.ModifiedNode.FinalFields;
        const prevFields = node.ModifiedNode.PreviousFields;
        
        if (fields && prevFields && prevFields.Balance && fields.Balance) {
          // 트러스트라인 잔액 변경 분석
          const currency = fields.Balance.currency;
          const issuer = fields.HighLimit.issuer === account ? fields.LowLimit.issuer : fields.HighLimit.issuer;
          
          let prevBalance = prevFields.Balance.value;
          let finalBalance = fields.Balance.value;
          
          // 잔액 값이 문자열이 아닌 경우 처리
          if (typeof prevBalance !== "string") prevBalance = prevBalance.toString();
          if (typeof finalBalance !== "string") finalBalance = finalBalance.toString();
          
          // 부호 조정 (계정의 관점에서)
          if (fields.HighLimit.issuer === account) {
            prevBalance = (-parseFloat(prevBalance)).toString();
            finalBalance = (-parseFloat(finalBalance)).toString();
          }
          
          const balanceDiff = parseFloat(finalBalance) - parseFloat(prevBalance);
          
          if (balanceDiff > 0) {
            received = { currency, issuer, value: balanceDiff.toString() };
          } else if (balanceDiff < 0) {
            delivered = { currency, issuer, value: (-balanceDiff).toString() };
          }
        }
      }
    }
    
    if (delivered || received) {
      return {
        delivered,
        received
      };
    }
    
    return null;
  }

  /**
   * Ripple 시간을 Unix 시간으로 변환
   */
  private rippleTimeToUnixTime(rippleTime: number): number {
    return (rippleTime + 946684800) * 1000;
  }
} 