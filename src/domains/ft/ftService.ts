import { Client, Wallet, xrpToDrops, Payment, TrustSet, AccountSet, dropsToXrp } from 'xrpl';
import { FT, TrustLineSettings, AccountSetOptions } from './FT';

export class FTService {
  private client: Client;
  private isConnected: boolean = false;
  private txTracker = new Map<string, number>(); // 트랜잭션 추적용 맵 추가

  constructor(client: Client) {
    this.client = client;
    console.log('[FTService] 초기화됨');
  }

  /**
   * 화폐 코드 형식 검증 및 변환
   * @param currencyCode 원본 화폐 코드
   * @returns 유효한 XRPL 화폐 코드
   */
  private validateCurrencyCode(currencyCode: string): string {
    console.log(`[FTService] 화폐 코드 검증: "${currencyCode}"`);
    
    // 3글자 ISO 표준 코드인 경우
    if (currencyCode.length === 3) {
      console.log(`[FTService] 3글자 ISO 코드 사용: ${currencyCode}`);
      return currencyCode;
    }
    
    // 이미 40자 16진수인 경우
    if (currencyCode.length === 40 && /^[0-9A-F]+$/i.test(currencyCode)) {
      console.log(`[FTService] 40자 16진수 코드 사용: ${currencyCode}`);
      return currencyCode;
    }
    
    // 3글자가 아닌 경우 16진수로 변환 후 40자로 패딩
    console.log(`[FTService] 화폐 코드 변환 필요: ${currencyCode} (현재 ${currencyCode.length}글자)`);
    
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
    
    console.log(`[FTService] 변환된 화폐 코드: ${hexCode}`);
    return hexCode;
  }

  private async ensureConnection() {
    console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
    if (!this.client.isConnected()) {
      console.log('[FTService] XRPL에 연결 시도...');
      await this.client.connect();
      this.isConnected = true;
      console.log('[FTService] XRPL 연결 성공');
    }
  }

  /**
   * 현재 네트워크 수수료 정보를 가져옴
   * @returns 권장 수수료 (drops 단위)
   */
  private async getFeeRecommendation(): Promise<string> {
    console.log('[FTService] 네트워크 수수료 정보 요청 중...');
    
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
      
      console.log(`[FTService] 수수료 정보 - 낮음: ${highFee}, 중간: ${mediumFee}, 높음: ${openFee}`);
      console.log(`[FTService] 권장 수수료: ${recommendedFee} drops (${dropsToXrp(recommendedFee)} XRP)`);
      
      // 최소 수수료보다 작지 않도록 확인
      return recommendedFee > highFee ? recommendedFee : highFee;
    } catch (error) {
      console.error('[FTService] 수수료 정보 요청 실패, 기본값 사용:', error);
      // 기본 수수료 반환 (10 drops)
      return xrpToDrops("0.00001");
    }
  }

  /**
   * FT(Fungible Token) 발행
   */
  async issueFT(ft: FT, wallet: Wallet): Promise<any> {
    console.log('[FTService] issueFT 호출됨', {
      tokenId: ft.tokenId,
      currency: ft.currency,
      amount: ft.amount,
      issuer: ft.issuer,
      destination: ft.destination
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[FTService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[FTService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 시퀀스 번호 업데이트 - 이것이 중복 트랜잭션 방지에 중요
      console.log(`[FTService] 계정 정보 요청 중... (주소: ${wallet.address})`);
      const accountInfo = await this.client.request({
        command: "account_info",
        account: wallet.address
      });
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[FTService] 계정 시퀀스 번호: ${sequence}`);

      // 화폐 코드 검증 및 변환
      const validCurrencyCode = this.validateCurrencyCode(ft.currency);

      // 메모 데이터 처리
      let memos = undefined;
      if (ft.memos && ft.memos.length > 0) {
        console.log('[FTService] 메모 데이터 처리 중...');
        memos = ft.memos.map(memo => {
          let memoData = memo.memo.memoData;
          console.log(`[FTService] 원본 메모 데이터: "${memoData}"`);
          
          if (!/^[0-9A-F]+$/i.test(memoData)) {
            // 16진수가 아닌 경우 문자열을 16진수로 변환
            memoData = Buffer.from(memoData, 'utf8').toString('hex').toUpperCase();
            console.log(`[FTService] 16진수로 변환된 메모 데이터: "${memoData}"`);
          }
          
          return {
            Memo: {
              MemoData: memoData
            }
          };
        });
        console.log('[FTService] 메모 처리 완료', memos);
      }

      // 토큰 발행 트랜잭션 구성
      console.log('[FTService] 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "Payment",
        Account: wallet.address,
        Destination: ft.destination || wallet.address,
        Amount: {
          currency: validCurrencyCode, // 검증된 화폐 코드 사용
          issuer: ft.issuer,
          value: ft.amount
        },
        Flags: ft.flags || 0,
        Fee: ft.fee || networkFee, // 동적으로 계산된 네트워크 수수료 사용
        Memos: memos,
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence  // 명시적으로 시퀀스 번호 지정
      };
      console.log('[FTService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[FTService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[FTService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 제출 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[FTService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[FTService] FT 발행 성공! 토큰 ID: ${ft.tokenId}`);
        return {
          success: true,
          result: result,
          tokenId: ft.tokenId,
          currency: validCurrencyCode,
          transactionResult: txResult
        };
      } else {
        console.error(`[FTService] FT 발행 실패: ${txResult}`);
        
        // 오류 메시지 매핑
        let errorMessage;
        switch (txResult) {
          case 'tecNO_LINE':
            errorMessage = "Trustline이 설정되어 있지 않습니다.";
            break;
          case 'tecNO_AUTH':
            errorMessage = "해당 화폐에 대한 권한이 없습니다.";
            break;
          case 'tecUNFUNDED':
            errorMessage = "잔액이 부족합니다.";
            break;
          default:
            errorMessage = `트랜잭션이 실패했습니다: ${txResult}`;
        }
        
        return {
          success: false,
          error: errorMessage,
          transactionResult: txResult,
          result: result,
          tokenId: ft.tokenId,
          currency: validCurrencyCode
        };
      }
    } catch (error: any) {
      console.error("[FTService] FT 발행 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      if (error.message?.includes("LastLedgerSequence")) {
        console.error("[FTService] LastLedgerSequence 오류 감지");
        throw new Error("트랜잭션 처리 시간 초과. 잠시 후 다시 시도해주세요.");
      } else if (error.message?.includes("temREDUNDANT")) {
        console.error("[FTService] 중복 트랜잭션 오류 감지");
        throw new Error("중복된 트랜잭션입니다. 이미 제출된 트랜잭션이 있습니다.");
      } else if (error.message?.includes("Unsupported Currency")) {
        console.error("[FTService] 화폐 코드 오류 감지");
        throw new Error("지원되지 않는 화폐 코드입니다. 화폐 코드는 3글자 ISO 코드이거나 40자 16진수여야 합니다.");
      } else {
        throw new Error(error?.message || 'FT 발행 중 오류가 발생했습니다.');
      }
    } finally {
      // 연결을 시작한 경우에만 연결 종료
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 특정 발행자의 FT 목록 조회
   */
  async getFTsByIssuer(issuerAddress: string): Promise<any> {
    console.log(`[FTService] getFTsByIssuer 호출됨 (발행자: ${issuerAddress})`);
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }
      
      // account_lines 명령을 사용하여 발행된 토큰 정보 가져오기
      console.log(`[FTService] account_lines 요청 중... (계정: ${issuerAddress})`);
      const response = await this.client.request({
        command: "account_lines",
        account: issuerAddress,
      });
      console.log(`[FTService] account_lines 응답 수신, 토큰 수: ${response.result.lines.length}`);
      
      console.log('[FTService] FT 목록 조회 성공');
      return {
        success: true,
        tokens: response.result.lines,
      };
    } catch (error: any) {
      console.error("[FTService] FT 목록 조회 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      throw new Error(error?.message || 'FT 목록 조회 중 오류가 발생했습니다.');
    } finally {
      // 연결을 시작한 경우에만 연결 종료
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * FT 전송
   */
  async transferFT(sender: Wallet, receiverAddress: string, currency: string, issuer: string, amount: string): Promise<any> {
    console.log('[FTService] transferFT 호출됨', {
      sender: sender.address,
      receiver: receiverAddress,
      currency,
      issuer,
      amount
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }
      
      // 현재 레저 정보 가져오기
      console.log('[FTService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[FTService] 현재 레저 시퀀스: ${currentLedgerSequence}`);
      
      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();
      
      // 시퀀스 번호 업데이트
      console.log(`[FTService] 계정 정보 요청 중... (주소: ${sender.address})`);
      const accountInfo = await this.client.request({
        command: "account_info",
        account: sender.address
      });
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[FTService] 계정 시퀀스 번호: ${sequence}`);
      
      // 화폐 코드 검증 및 변환
      const validCurrencyCode = this.validateCurrencyCode(currency);
      
      console.log('[FTService] 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "Payment",
        Account: sender.address,
        Destination: receiverAddress,
        Amount: {
          currency: validCurrencyCode, // 검증된 화폐 코드 사용
          issuer: issuer,
          value: amount
        },
        Fee: networkFee, // 동적으로 계산된 네트워크 수수료 사용
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence
      };
      console.log('[FTService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));
      
      console.log('[FTService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet: sender });
      console.log('[FTService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[FTService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      // tesSUCCESS: 완전한 성공
      // 다른 결과 코드는 실패로 간주
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log('[FTService] FT 전송 성공!');
        return {
          success: true,
          result: result,
          currency: validCurrencyCode,
          transactionResult: txResult
        };
      } else {
        console.error(`[FTService] FT 전송 실패: ${txResult}`);
        
        // 오류 메시지 매핑
        let errorMessage;
        switch (txResult) {
          case 'tecPATH_DRY':
            errorMessage = "전송 경로가 없습니다. Trustline이 설정되어 있는지 확인하세요.";
            break;
          case 'tecNO_LINE':
            errorMessage = "Trustline이 설정되어 있지 않습니다.";
            break;
          case 'tecNO_AUTH':
            errorMessage = "해당 화폐에 대한 권한이 없습니다.";
            break;
          case 'tecPATH_PARTIAL':
            errorMessage = "부분적인 전송만 가능합니다.";
            break;
          case 'tecNO_ISSUER':
            errorMessage = "발행자를 찾을 수 없습니다.";
            break;
          case 'tecUNFUNDED':
            errorMessage = "잔액이 부족합니다.";
            break;
          default:
            errorMessage = `트랜잭션이 실패했습니다: ${txResult}`;
        }
        
        return {
          success: false,
          error: errorMessage,
          transactionResult: txResult,
          result: result
        };
      }
    } catch (error: any) {
      console.error("[FTService] FT 전송 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      if (error.message?.includes("LastLedgerSequence")) {
        console.error("[FTService] LastLedgerSequence 오류 감지");
        throw new Error("트랜잭션 처리 시간 초과. 잠시 후 다시 시도해주세요.");
      } else if (error.message?.includes("temREDUNDANT")) {
        console.error("[FTService] 중복 트랜잭션 오류 감지");
        throw new Error("중복된 트랜잭션입니다. 이미 제출된 트랜잭션이 있습니다.");
      } else if (error.message?.includes("Unsupported Currency")) {
        console.error("[FTService] 화폐 코드 오류 감지");
        throw new Error("지원되지 않는 화폐 코드입니다. 화폐 코드는 3글자 ISO 코드이거나 40자 16진수여야 합니다.");
      } else {
        throw new Error(error?.message || 'FT 전송 중 오류가 발생했습니다.');
      }
    } finally {
      // 연결을 시작한 경우에만 연결 종료
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * Trustline 설정 (토큰 신뢰 설정)
   */
  async setTrustLine(settings: TrustLineSettings, wallet: Wallet, retryCount = 0): Promise<any> {
    const MAX_RETRIES = 3;
    
    console.log('[FTService] setTrustLine 호출됨', {
      account: settings.account,
      issuer: settings.issuer,
      currency: settings.currency,
      limit: settings.limit
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[FTService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[FTService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 계정 정보 및 시퀀스 번호 가져오기
      console.log(`[FTService] 계정 정보 요청 중... (주소: ${wallet.address})`);
      const accountInfo = await this.client.request({
        command: "account_info",
        account: wallet.address
      });
      
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[FTService] 계정 시퀀스 번호: ${sequence}`);

      // 화폐 코드 검증 및 변환
      const validCurrencyCode = this.validateCurrencyCode(settings.currency);
      console.log(`[FTService] 변환된 화폐 코드: ${validCurrencyCode}`);

      // 플래그 계산
      let flags = 0;
      if (settings.ripplingDisabled === true) flags |= 0x00020000; // tfSetNoRipple
      if (settings.freezeEnabled === true) flags |= 0x00100000;   // tfSetFreeze
      if (settings.noRipple === false) flags |= 0x00040000;       // tfClearNoRipple
      
      // TrustSet 트랜잭션 구성
      console.log('[FTService] TrustSet 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "TrustSet",
        Account: settings.account,
        LimitAmount: {
          currency: validCurrencyCode,
          issuer: settings.issuer,
          value: settings.limit
        },
        Flags: flags,
        Fee: networkFee, // 동적으로 계산된 네트워크 수수료 사용
        LastLedgerSequence: currentLedgerSequence + 100,
        Sequence: sequence
      };
      
      // QualityIn과 QualityOut 설정 (존재하는 경우)
      if (settings.qualityIn !== undefined) {
        tx.QualityIn = settings.qualityIn;
      }
      if (settings.qualityOut !== undefined) {
        tx.QualityOut = settings.qualityOut;
      }
      
      console.log('[FTService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[FTService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[FTService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 제출 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[FTService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[FTService] Trustline 설정 성공!`);
        return {
          success: true,
          result: result,
          account: settings.account,
          issuer: settings.issuer,
          currency: validCurrencyCode,
          limit: settings.limit,
          transactionResult: txResult
        };
      } else {
        console.error(`[FTService] Trustline 설정 실패: ${txResult}`);
        
        // 오류 메시지 매핑
        let errorMessage;
        switch (txResult) {
          case 'tecDST_TAG_NEEDED':
            errorMessage = "대상 태그가 필요합니다.";
            break;
          case 'tecNO_PERMISSION':
            errorMessage = "설정 권한이 없습니다.";
            break;
          case 'tecUNFUNDED':
            errorMessage = "잔액이 부족합니다.";
            break;
          default:
            errorMessage = `트랜잭션이 실패했습니다: ${txResult}`;
        }
        
        return {
          success: false,
          error: errorMessage,
          transactionResult: txResult,
          result: result,
          account: settings.account,
          issuer: settings.issuer,
          currency: validCurrencyCode,
          limit: settings.limit
        };
      }
    } catch (error: any) {
      console.error("[FTService] Trustline 설정 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      // LastLedgerSequence 초과 오류 시 자동 재시도
      if (error.message?.includes("LastLedgerSequence") && retryCount < MAX_RETRIES) {
        console.log(`[FTService] LastLedgerSequence 오류로 재시도 ${retryCount + 1}/${MAX_RETRIES}`);
        // 1초 대기 후 재시도
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.setTrustLine(settings, wallet, retryCount + 1);
      } else if (error.message?.includes("temREDUNDANT")) {
        console.error("[FTService] 중복 트랜잭션 오류 감지");
        throw new Error("중복된 트랜잭션입니다. 이미 제출된 트랜잭션이 있습니다.");
      } else if (error.message?.includes("Unsupported Currency")) {
        console.error("[FTService] 화폐 코드 오류 감지");
        throw new Error("지원되지 않는 화폐 코드입니다. 화폐 코드는 3글자 ISO 코드이거나 40자 16진수여야 합니다.");
      } else {
        throw new Error(error?.message || 'Trustline 설정 중 오류가 발생했습니다.');
      }
    } finally {
      // 연결을 시작한 경우에만 연결 종료
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }
  
  /**
   * 기존 Trustline 정보 조회
   */
  async getTrustLines(address: string, options?: { currency?: string, issuer?: string }): Promise<any> {
    console.log(`[FTService] getTrustLines 호출됨 (주소: ${address})`, options);
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }
      
      // account_lines 명령 파라미터 설정
      const requestParams: any = {
        command: "account_lines",
        account: address
      };
      
      // 특정 화폐와 발행자로 필터링하는 옵션 추가
      if (options?.currency) {
        requestParams.currency = options.currency;
      }
      if (options?.issuer) {
        requestParams.peer = options.issuer;
      }
      
      console.log(`[FTService] account_lines 요청 중...`, requestParams);
      const response = await this.client.request(requestParams);
      
      // response.result에 대한 타입 단언 추가
      const result = response.result as {
        lines: any[];
        ledger_current_index: number;
        ledger_hash: string;
      };
      
      console.log(`[FTService] Trustline 조회 성공, 결과 ${result.lines.length}개`);
      return {
        success: true,
        account: address,
        trustlines: result.lines,
        ledger_index: result.ledger_current_index,
        ledger_hash: result.ledger_hash
      };
    } catch (error: any) {
      console.error("[FTService] Trustline 조회 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      throw new Error(error?.message || 'Trustline 조회 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }

  /**
   * 트랜잭션 결과 코드를 평가하여 성공/실패와 오류 메시지를 반환
   */
  private evaluateTransactionResult(txResult: string): { isSuccess: boolean, errorMessage?: string } {
    // tesSUCCESS만 성공으로 간주
    const isSuccess = txResult === 'tesSUCCESS';
    
    if (isSuccess) {
      return { isSuccess: true };
    }
    
    // 오류 메시지 매핑
    let errorMessage: string;
    switch (txResult) {
      case 'tecPATH_DRY':
        errorMessage = "전송 경로가 없습니다. Trustline이 설정되어 있는지 확인하세요.";
        break;
      case 'tecNO_LINE':
        errorMessage = "Trustline이 설정되어 있지 않습니다.";
        break;
      case 'tecNO_AUTH':
        errorMessage = "해당 화폐에 대한 권한이 없습니다.";
        break;
      case 'tecPATH_PARTIAL':
        errorMessage = "부분적인 전송만 가능합니다.";
        break;
      case 'tecNO_ISSUER':
        errorMessage = "발행자를 찾을 수 없습니다.";
        break;
      case 'tecUNFUNDED':
        errorMessage = "잔액이 부족합니다.";
        break;
      case 'tecDST_TAG_NEEDED':
        errorMessage = "대상 태그가 필요합니다.";
        break;
      case 'tecNO_PERMISSION':
        errorMessage = "설정 권한이 없습니다.";
        break;
      default:
        errorMessage = `트랜잭션이 실패했습니다: ${txResult}`;
    }
    
    return { isSuccess: false, errorMessage };
  }

  /**
   * AccountSet 트랜잭션을 사용하여 계정 설정 변경
   * @param options 계정 설정 옵션
   * @param wallet 서명에 사용할 지갑
   * @returns 트랜잭션 결과
   */
  async setAccountOptions(options: AccountSetOptions, wallet: Wallet): Promise<any> {
    console.log('[FTService] setAccountOptions 호출됨', {
      account: options.account,
      defaultRipple: options.defaultRipple
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[FTService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[FTService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 계정 정보 및 시퀀스 번호 가져오기
      console.log(`[FTService] 계정 정보 요청 중... (주소: ${wallet.address})`);
      const accountInfo = await this.client.request({
        command: "account_info",
        account: wallet.address
      });
      
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[FTService] 계정 시퀀스 번호: ${sequence}`);

      // 플래그 계산
      let setFlag = undefined;
      let clearFlag = undefined;
      
      // DefaultRipple 설정 처리
      if (options.defaultRipple !== undefined) {
        if (options.defaultRipple) {
          setFlag = 8; // asfDefaultRipple(8) 설정
          console.log('[FTService] DefaultRipple 활성화 플래그 설정');
        } else {
          clearFlag = 8; // asfDefaultRipple(8) 해제
          console.log('[FTService] DefaultRipple 비활성화 플래그 설정');
        }
      }
      
      // 다른 설정 플래그 처리 (필요에 따라 추가)
      if (options.requireDest !== undefined) {
        if (options.requireDest) setFlag = 1; // asfRequireDest
        else clearFlag = 1;
      }
      
      if (options.requireAuth !== undefined) {
        if (options.requireAuth) setFlag = 2; // asfRequireAuth
        else clearFlag = 2;
      }
      
      if (options.disallowXRP !== undefined) {
        if (options.disallowXRP) setFlag = 3; // asfDisallowXRP
        else clearFlag = 3;
      }
      
      if (options.disableMasterKey !== undefined) {
        if (options.disableMasterKey) setFlag = 4; // asfDisableMaster
        else clearFlag = 4;
      }
      
      // AccountSet 트랜잭션 구성
      console.log('[FTService] AccountSet 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "AccountSet",
        Account: options.account,
        Fee: networkFee,
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence
      };
      
      // 플래그 설정/해제
      if (setFlag !== undefined) {
        tx.SetFlag = setFlag;
      }
      if (clearFlag !== undefined) {
        tx.ClearFlag = clearFlag;
      }
      
      // 선택적 필드 추가
      if (options.transferRate !== undefined) {
        // 실제 비율값은 10억을 곱한 값으로 설정 (예: 0.2% = 1002000000)
        tx.TransferRate = Math.floor(1000000000 * (1 + options.transferRate / 100));
      }
      
      if (options.domain !== undefined) {
        // 도메인은 16진수로 변환해야 함
        tx.Domain = Buffer.from(options.domain, 'utf8').toString('hex').toUpperCase();
      }
      
      if (options.emailHash !== undefined) {
        tx.EmailHash = options.emailHash;
      }
      
      if (options.messageKey !== undefined) {
        tx.MessageKey = options.messageKey;
      }
      
      if (options.tickSize !== undefined) {
        tx.TickSize = options.tickSize;
      }
      
      console.log('[FTService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[FTService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[FTService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[FTService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[FTService] 계정 설정 변경 성공!`);
        return {
          success: true,
          result: result,
          account: options.account,
          transactionResult: txResult,
          defaultRipple: options.defaultRipple
        };
      } else {
        console.error(`[FTService] 계정 설정 변경 실패: ${txResult}`);
        
        return {
          success: false,
          error: `트랜잭션이 실패했습니다: ${txResult}`,
          transactionResult: txResult,
          result: result
        };
      }
    } catch (error: any) {
      console.error("[FTService] 계정 설정 변경 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      throw new Error(error?.message || '계정 설정 변경 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }
  
  /**
   * NoRipple 설정을 비활성화하는 트러스트라인 설정
   * @param settings 트러스트라인 설정
   * @param wallet 서명에 사용할 지갑
   * @returns 트랜잭션 결과
   */
  async setTrustLineNoRipple(settings: TrustLineSettings, wallet: Wallet): Promise<any> {
    console.log('[FTService] setTrustLineNoRipple 호출됨', {
      account: settings.account,
      issuer: settings.issuer,
      currency: settings.currency,
      noRipple: settings.noRipple
    });
    
    let shouldDisconnect = false;
    
    try {
      console.log('[FTService] 연결 상태 확인: ', this.client.isConnected() ? '연결됨' : '연결 안됨');
      if (!this.client.isConnected()) {
        console.log('[FTService] XRPL에 연결 시도...');
        await this.client.connect();
        shouldDisconnect = true;
        console.log('[FTService] XRPL 연결 성공');
      }

      // 현재 레저 정보 가져오기
      console.log('[FTService] 현재 레저 정보 요청 중...');
      const ledgerInfo = await this.client.request({
        command: "ledger_current"
      });
      const currentLedgerSequence = ledgerInfo.result.ledger_current_index;
      console.log(`[FTService] 현재 레저 시퀀스: ${currentLedgerSequence}`);

      // 네트워크 수수료 가져오기
      const networkFee = await this.getFeeRecommendation();

      // 계정 정보 및 시퀀스 번호 가져오기
      console.log(`[FTService] 계정 정보 요청 중... (주소: ${wallet.address})`);
      const accountInfo = await this.client.request({
        command: "account_info",
        account: wallet.address
      });
      
      const sequence = accountInfo.result.account_data.Sequence;
      console.log(`[FTService] 계정 시퀀스 번호: ${sequence}`);

      // 화폐 코드 검증 및 변환
      const validCurrencyCode = this.validateCurrencyCode(settings.currency);
      console.log(`[FTService] 변환된 화폐 코드: ${validCurrencyCode}`);

      // 플래그 계산 - NoRipple 설정 관련
      let flags = 0;
      
      // NoRipple 설정 처리
      if (settings.noRipple === false) {
        // NoRipple 해제 (리플링 활성화)
        flags |= 0x00040000; // tfClearNoRipple
        console.log('[FTService] NoRipple 해제 플래그 설정 (리플링 활성화)');
      } else if (settings.noRipple === true) {
        // NoRipple 설정 (리플링 비활성화)
        flags |= 0x00020000; // tfSetNoRipple
        console.log('[FTService] NoRipple 설정 플래그 설정 (리플링 비활성화)');
      }
      
      // 다른 설정이 있으면 추가
      if (settings.freezeEnabled === true) {
        flags |= 0x00100000; // tfSetFreeze
      } else if (settings.freezeEnabled === false) {
        flags |= 0x00200000; // tfClearFreeze
      }
      
      // 기존 TrustLine 정보 확인 (선택적)
      try {
        const trustlines = await this.client.request({
          command: "account_lines",
          account: settings.account,
          peer: settings.issuer,
          ledger_index: "validated"
        });
        
        const existingLine = trustlines.result.lines.find(
          (line: any) => line.currency === validCurrencyCode
        );
        
        if (existingLine) {
          console.log('[FTService] 기존 TrustLine 찾음:', existingLine);
          // 현재 한도를 유지하고 싶다면 existingLine.limit 값을 사용할 수 있음
        } else {
          console.log('[FTService] 기존 TrustLine을 찾을 수 없음. 새로 생성합니다.');
        }
      } catch (e) {
        console.warn('[FTService] 기존 TrustLine 조회 실패, 계속 진행:', e);
      }
      
      // TrustSet 트랜잭션 구성
      console.log('[FTService] TrustSet 트랜잭션 구성 중...');
      const tx: any = {
        TransactionType: "TrustSet",
        Account: settings.account,
        LimitAmount: {
          currency: validCurrencyCode,
          issuer: settings.issuer,
          value: settings.limit
        },
        Flags: flags,
        Fee: networkFee,
        LastLedgerSequence: currentLedgerSequence + 20,
        Sequence: sequence
      };
      
      // QualityIn과 QualityOut 설정 (존재하는 경우)
      if (settings.qualityIn !== undefined) {
        tx.QualityIn = settings.qualityIn;
      }
      if (settings.qualityOut !== undefined) {
        tx.QualityOut = settings.qualityOut;
      }
      
      console.log('[FTService] 트랜잭션 구성 완료', JSON.stringify(tx, null, 2));

      // 트랜잭션 제출
      console.log('[FTService] 트랜잭션 제출 중...');
      const result = await this.client.submitAndWait(tx, { wallet });
      console.log('[FTService] 트랜잭션 제출 결과:', JSON.stringify(result, null, 2));
      
      // 트랜잭션 결과 확인
      const txResult = result.result.meta.TransactionResult;
      console.log(`[FTService] 트랜잭션 결과 코드: ${txResult}`);
      
      // 성공적인 트랜잭션 결과 코드 확인
      const isSuccess = txResult === 'tesSUCCESS';
      
      if (isSuccess) {
        console.log(`[FTService] TrustLine NoRipple 설정 변경 성공!`);
        return {
          success: true,
          result: result,
          account: settings.account,
          issuer: settings.issuer,
          currency: validCurrencyCode,
          limit: settings.limit,
          noRipple: settings.noRipple,
          transactionResult: txResult
        };
      } else {
        console.error(`[FTService] TrustLine NoRipple 설정 변경 실패: ${txResult}`);
        
        return {
          success: false,
          error: `트랜잭션이 실패했습니다: ${txResult}`,
          transactionResult: txResult,
          result: result
        };
      }
    } catch (error: any) {
      console.error("[FTService] TrustLine NoRipple 설정 변경 중 오류 발생:", error);
      console.error("[FTService] 오류 메시지:", error?.message);
      console.error("[FTService] 오류 세부 정보:", error?.data || '세부 정보 없음');
      
      throw new Error(error?.message || 'TrustLine NoRipple 설정 변경 중 오류가 발생했습니다.');
    } finally {
      if (shouldDisconnect && this.client.isConnected()) {
        try {
          console.log('[FTService] XRPL 연결 종료 중...');
          await this.client.disconnect();
          console.log('[FTService] XRPL 연결 종료 완료');
        } catch (err) {
          console.error("[FTService] 연결 종료 중 오류:", err);
        }
      }
    }
  }
} 