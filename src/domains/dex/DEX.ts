/**
 * DEX(Decentralized Exchange) 관련 모델 정의
 */

// 통화 금액 인터페이스
export interface Currency {
  currency: string;   // 화폐 코드
  issuer?: string;    // 발행자 주소 (XRP가 아닌 경우 필수)
  value?: string;     // 금액 (XRP가 아닌 경우 문자열 형태)
}

// OfferCreate 요청 인터페이스
export interface OfferCreateRequest {
  account: string;     // 오퍼를 생성할 계정
  takerGets: Currency | string;  // 판매할 통화/금액 (XRP인 경우 문자열)
  takerPays: Currency | string;  // 구매할 통화/금액 (XRP인 경우 문자열)
  expiration?: number; // 만료 시간 (선택 사항)
  offerSequence?: number; // 대체할 기존 오퍼 시퀀스 (선택 사항)
  passive?: boolean;   // 수동 오퍼 여부 (선택 사항)
  immediateOrCancel?: boolean;  // 즉시 체결 또는 취소 여부 (선택 사항)
  fillOrKill?: boolean;  // 전체 체결 또는 취소 여부 (선택 사항)
  seed: string;       // 계정의 비밀 시드
}

// 오퍼 조회 필터 인터페이스
export interface OfferQueryFilter {
  account?: string;    // 계정 주소로 필터링
  limit?: number;      // 결과 제한 수
  ledgerIndex?: string | number; // 조회할 레저 인덱스
  marker?: any;        // 페이징을 위한 마커
}

// 오더북 쿼리 인터페이스
export interface OrderBookQuery {
  takerGets: Currency;  // 판매할 통화 정보
  takerPays: Currency;  // 구매할 통화 정보
  limit?: number;       // 결과 제한 수
  taker?: string;       // 테이커 계정 주소 (선택 사항)
}

// 오퍼 취소 요청 인터페이스
export interface OfferCancelRequest {
  account: string;     // 오퍼를 취소할 계정
  offerSequence: number; // 취소할 오퍼의 시퀀스 번호
  seed: string;        // 계정의 비밀 시드
} 