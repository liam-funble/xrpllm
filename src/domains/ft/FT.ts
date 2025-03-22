// FT(Fungible Token) 데이터 모델 정의
export interface Memo {
  memo: {
    memoData: string;
  };
}

export interface FT {
  tokenId: string;
  issuer: string;
  currency: string;
  amount: string;
  destination?: string;
  flags?: number;
  fee?: string;
  memos?: Memo[];
}

// FT 데이터 검증 로직
export function validateFT(data: any): FT {
  // 필수 필드 확인
  if (!data.tokenId || typeof data.tokenId !== 'string') {
    throw new Error('tokenId가 올바르지 않습니다.');
  }
  
  if (!data.issuer || typeof data.issuer !== 'string') {
    throw new Error('issuer가 올바르지 않습니다.');
  }
  
  if (!data.currency || typeof data.currency !== 'string') {
    throw new Error('currency가 올바르지 않습니다.');
  }
  
  if (!data.amount || typeof data.amount !== 'string') {
    throw new Error('amount가 올바르지 않습니다.');
  }
  
  // 선택적 필드 검증
  if (data.destination !== undefined && typeof data.destination !== 'string') {
    throw new Error('destination이 올바르지 않습니다.');
  }
  
  if (data.flags !== undefined && typeof data.flags !== 'number') {
    throw new Error('flags가 올바르지 않습니다.');
  }
  
  if (data.fee !== undefined && typeof data.fee !== 'string') {
    throw new Error('fee가 올바르지 않습니다.');
  }
  
  if (data.memos !== undefined) {
    if (!Array.isArray(data.memos)) {
      throw new Error('memos는 배열이어야 합니다.');
    }
    
    // memo 배열 내의 각 항목 검증
    data.memos.forEach((memo: any) => {
      if (!memo.memo || typeof memo.memo !== 'object' || !memo.memo.memoData || typeof memo.memo.memoData !== 'string') {
        throw new Error('memo 형식이 올바르지 않습니다.');
      }
    });
  }
  
  return data as FT;
}

// AccountSet을 위한 인터페이스
export interface AccountSetOptions {
  account: string;    // 설정을 변경할 계정
  defaultRipple?: boolean; // DefaultRipple 활성화/비활성화
  requireDest?: boolean;   // 목적지 태그 요구 설정 (선택 사항)
  requireAuth?: boolean;   // 인증 요구 설정 (선택 사항)
  disallowXRP?: boolean;   // XRP 수신 거부 설정 (선택 사항)
  disableMasterKey?: boolean; // 마스터 키 비활성화 (선택 사항)
  emailHash?: string;      // 이메일 해시 (선택 사항)
  messageKey?: string;     // 메시지 키 (선택 사항)
  domain?: string;         // 도메인 (선택 사항)
  transferRate?: number;   // 전송 수수료 비율 (선택 사항)
  tickSize?: number;       // 호가 단위 (선택 사항)
}

// NoRipple 설정을 위한 인터페이스 (기존 TrustLineSettings 확장)
export interface TrustLineSettings {
  account: string;    // Trustline을 설정할 계정
  issuer: string;     // 토큰 발행자 주소
  currency: string;   // 화폐 코드
  limit: string;      // 신뢰 한도 (최대 금액)
  qualityIn?: number; // 입금 품질 (선택 사항)
  qualityOut?: number; // 출금 품질 (선택 사항)
  ripplingDisabled?: boolean; // 리플링 비활성화 여부 (선택 사항)
  noRipple?: boolean; // noRipple 플래그 (선택 사항)
  freezeEnabled?: boolean; // 동결 활성화 여부 (선택 사항)
} 