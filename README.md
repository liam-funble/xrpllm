# XRPL Integration with LLM Service

이 프로젝트는 XRPL(XRP Ledger)과 LLM(Large Language Model)을 통합하여 자연어로 XRPL 관련 작업을 수행할 수 있는 API 서버입니다.

## 주요 기능

### XRPL 기능
- 계정 관리
  - 계정 생성
  - 계정 정보 조회
- 트랜잭션 관리
  - XRP 송금
  - 트랜잭션 내역 조회
  - 트랜잭션 상세 정보 조회

### LLM 기능
- 텍스트 생성
  - 일반 응답
  - 컨텍스트 기반 응답
    - 사용자 정보 (닉네임, 주소) 기반
    - 친구 목록 정보 기반
- 응답 형식
  - JSON 구조화된 응답
  - 상태 정보 포함
  - 작업 타입 구분

## 시작하기

### 필수 조건
- Node.js
- npm
- XRPL 테스트넷 또는 메인넷 접근
- LLM 서비스 (기본: Ollama)

### 설치

```bash
# 저장소 클론
git clone [repository-url]

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 환경 변수 설정

```env
# LLM 설정
LLM_PROVIDER=ollama
LLM_API_KEY=your_api_key_here  # Ollama 사용시 선택사항
LLM_API_URL=http://localhost:11434/api/generate

# XRPL 설정
XRPL_SERVER=wss://s.altnet.rippletest.net:51233

# CORS 설정
# 개발 환경
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# 프로덕션 환경
# CORS_ORIGINS=https://web-nft-front-128y2k2llvpe2qao.sel5.cloudtype.app
```

### 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build
npm start
```

### Docker를 통한 실행

```bash
# 도커 이미지 빌드
docker build -t xrpllm-service .

# 도커 컨테이너 실행 (개발 환경)
docker run -d \
  -p 3000:3000 \
  -e LLM_PROVIDER=ollama \
  -e LLM_API_URL=http://host.docker.internal:11434/api/generate \
  -e XRPL_SERVER=wss://s.altnet.rippletest.net:51233 \
  -e CORS_ORIGINS=http://localhost:3000,http://localhost:5173 \
  xrpllm-service

# 도커 컨테이너 실행 (프로덕션 환경)
docker run -d \
  -p 3000:3000 \
  -e LLM_PROVIDER=ollama \
  -e LLM_API_URL=http://host.docker.internal:11434/api/generate \
  -e XRPL_SERVER=wss://s.altnet.rippletest.net:51233 \
  -e CORS_ORIGINS=https://web-nft-front-128y2k2llvpe2qao.sel5.cloudtype.app \
  xrpllm-service
```

> 참고: Mac/Windows에서 Ollama를 로컬에서 실행하는 경우 `host.docker.internal`을 사용하여 호스트 머신의 Ollama에 접근할 수 있습니다. Linux의 경우 `--network=host` 옵션을 사용하거나 호스트 IP를 직접 지정해야 할 수 있습니다.

## API 엔드포인트

### XRPL 관련

#### 계정
- `POST /api/accounts/create` - 새 계정 생성
- `GET /api/accounts/:address` - 계정 정보 조회

#### 트랜잭션
- `POST /api/transactions/send` - XRP 송금
- `GET /api/transactions/history/:address` - 거래 내역 조회
- `GET /api/transactions/:hash` - 거래 상세 정보 조회

### LLM 관련
- `POST /api/llm/generate` - 텍스트 생성
  ```json
  {
    "prompt": "송금하기",
    "model": "gemma3:27b",
    "friends": [
      {
        "nickname": "Alice",
        "address": "rAliceXRPAddress..."
      }
    ],
    "my": {
      "nickname": "Bob",
      "address": "rBobXRPAddress..."
    }
  }
  ```

## API 문서
API 문서는 Swagger UI를 통해 제공됩니다.
```
http://localhost:3000/api-docs
```

## 응답 형식

### LLM 응답 구조
```json
{
  "statusInfo": {
    "status": "success" | "fail",
    "message": "응답 메시지"
  },
  "data": {
    "task": "task_name",
    "parameters": {
      // 작업별 파라미터
    }
  }
}
```

## 기술 스택
- TypeScript
- Express.js
- XRPL.js
- Axios
- Ollama/LLM Integration
- Swagger UI
- Docker

## 보안 고려사항
- 프로덕션 환경에서는 반드시 HTTPS를 사용하세요.
- API 키와 비밀키는 안전하게 관리해야 합니다.
- 계정 시크릿 키는 클라이언트 측에서 관리되어야 합니다.
- 사용자 정보와 친구 목록은 암호화하여 전송해야 합니다.

## 라이선스
이 프로젝트는 MIT 라이선스에 따라 배포됩니다. 이 소프트웨어를 자유롭게 사용, 복사, 수정, 병합, 배포, 2차 라이선스 부여, 판매할 수 있으며, 단 소프트웨어의 모든 복사본 또는 상당 부분에 저작권 표시와 허가 문구를 포함해야 합니다. 자세한 내용은 [LICENSE](LICENSE.md) 파일을 참고하세요.

## 문의
박찬호 chpark6737@gmail.com