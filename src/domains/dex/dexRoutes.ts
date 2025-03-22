import { Router } from 'express';
import { Client } from 'xrpl';
import { DEXController } from './dexController';

export class DEXRoutes {
  private router: Router;
  private dexController: DEXController;

  constructor(client: Client) {
    this.router = Router();
    this.dexController = new DEXController(client);
    this.initializeRoutes();
    console.log('[DEXRoutes] 초기화됨');
  }

  private initializeRoutes(): void {
    /**
     * @swagger
     * tags:
     *   name: DEX
     *   description: XRP Ledger 분산형 거래소(DEX) 관련 API
     */

    /**
     * @swagger
     * components:
     *   schemas:
     *     Currency:
     *       type: object
     *       properties:
     *         currency:
     *           type: string
     *           description: 통화 코드 (XRP 또는 3글자 ISO 코드 또는 커스텀 코드)
     *         issuer:
     *           type: string
     *           description: 발행자 주소 (XRP가 아닌 경우 필수)
     *         value:
     *           type: string
     *           description: 금액 (XRP가 아닌 경우 필수)
     *       required:
     *         - currency
     *
     *     OfferCreateRequest:
     *       type: object
     *       properties:
     *         account:
     *           type: string
     *           description: 오퍼를 생성할 계정 주소
     *         takerGets:
     *           oneOf:
     *             - type: string
     *               description: 판매할 XRP 금액
     *             - $ref: '#/components/schemas/Currency'
     *         takerPays:
     *           oneOf:
     *             - type: string
     *               description: 구매할 XRP 금액
     *             - $ref: '#/components/schemas/Currency'
     *         expiration:
     *           type: integer
     *           description: 만료 시간 (선택 사항)
     *         offerSequence:
     *           type: integer
     *           description: 대체할 기존 오퍼 시퀀스 (선택 사항)
     *         passive:
     *           type: boolean
     *           description: 수동 오퍼 여부 (선택 사항)
     *         immediateOrCancel:
     *           type: boolean
     *           description: 즉시 체결 또는 취소 여부 (선택 사항)
     *         fillOrKill:
     *           type: boolean
     *           description: 전체 체결 또는 취소 여부 (선택 사항)
     *         seed:
     *           type: string
     *           description: 계정의 비밀 시드
     *       required:
     *         - account
     *         - takerGets
     *         - takerPays
     *         - seed
     *
     *     OfferCancelRequest:
     *       type: object
     *       properties:
     *         account:
     *           type: string
     *           description: 오퍼를 취소할 계정 주소
     *         offerSequence:
     *           type: integer
     *           description: 취소할 오퍼의 시퀀스 번호
     *         seed:
     *           type: string
     *           description: 계정의 비밀 시드
     *       required:
     *         - account
     *         - offerSequence
     *         - seed
     */

    /**
     * @swagger
     * /api/dex/offer/create:
     *   post:
     *     summary: 새로운 오퍼 생성
     *     tags: [DEX]
     *     description: XRP Ledger의 내장 DEX에 새로운 거래 제안(오퍼)을 생성합니다.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/OfferCreateRequest'
     *     responses:
     *       200:
     *         description: 오퍼 생성 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 account:
     *                   type: string
     *                   description: 오퍼를 생성한 계정
     *                 offerSequence:
     *                   type: string
     *                   description: 생성된 오퍼의 시퀀스 번호
     *                 takerGets:
     *                   oneOf:
     *                     - type: string
     *                     - $ref: '#/components/schemas/Currency'
     *                   description: 판매할 통화/금액
     *                 takerPays:
     *                   oneOf:
     *                     - type: string
     *                     - $ref: '#/components/schemas/Currency'
     *                   description: 구매할 통화/금액
     *                 transactionResult:
     *                   type: string
     *                   example: tesSUCCESS
     *       400:
     *         description: 잘못된 요청 또는 오퍼 생성 실패
     *       500:
     *         description: 서버 오류
     */
    this.router.post('/offer/create', this.dexController.createOffer.bind(this.dexController));

    /**
     * @swagger
     * /api/dex/offers/{account}:
     *   get:
     *     summary: 계정의 모든 오퍼 조회
     *     tags: [DEX]
     *     description: 특정 계정이 생성한 모든 오퍼를 조회합니다.
     *     parameters:
     *       - in: path
     *         name: account
     *         required: true
     *         schema:
     *           type: string
     *         description: 오퍼를 조회할 계정 주소
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: 반환할 최대 항목 수
     *       - in: query
     *         name: ledger_index
     *         schema:
     *           type: string
     *         description: 조회할 레저 인덱스 (기본값은 validated)
     *       - in: query
     *         name: marker
     *         schema:
     *           type: string
     *         description: 페이징을 위한 마커
     *     responses:
     *       200:
     *         description: 오퍼 목록 조회 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 account:
     *                   type: string
     *                   description: 조회한 계정 주소
     *                 offers:
     *                   type: array
     *                   items:
     *                     type: object
     *                   description: 오퍼 목록
     *                 ledger_index:
     *                   type: integer
     *                   description: 조회한 레저 인덱스
     *                 ledger_hash:
     *                   type: string
     *                   description: 조회한 레저의 해시
     *                 marker:
     *                   type: string
     *                   description: 다음 페이지를 위한 마커 (항목이 더 있는 경우)
     *       400:
     *         description: 잘못된 요청
     *       500:
     *         description: 서버 오류
     */
    this.router.get('/offers/:account', this.dexController.getAccountOffers.bind(this.dexController));

    /**
     * @swagger
     * /api/dex/orderbook:
     *   get:
     *     summary: 오더북 조회
     *     tags: [DEX]
     *     description: 특정 통화 쌍에 대한 오더북을 조회합니다.
     *     parameters:
     *       - in: query
     *         name: taker_gets
     *         required: true
     *         schema:
     *           type: string
     *         description: 판매할 통화 (형식 XRP 또는 CURRENCY:ISSUER)
     *       - in: query
     *         name: taker_pays
     *         required: true
     *         schema:
     *           type: string
     *         description: 구매할 통화 (형식 XRP 또는 CURRENCY:ISSUER)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: 반환할 최대 항목 수
     *       - in: query
     *         name: taker
     *         schema:
     *           type: string
     *         description: 조회자 계정 주소
     *     responses:
     *       200:
     *         description: 오더북 조회 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 offers:
     *                   type: array
     *                   items:
     *                     type: object
     *                   description: 오퍼 목록
     *                 ledger_index:
     *                   type: integer
     *                   description: 조회한 레저 인덱스
     *                 ledger_hash:
     *                   type: string
     *                   description: 조회한 레저의 해시
     *       400:
     *         description: 잘못된 요청
     *       500:
     *         description: 서버 오류
     */
    this.router.get('/orderbook', this.dexController.getOrderBook.bind(this.dexController));

    /**
     * @swagger
     * /api/dex/offer/cancel:
     *   post:
     *     summary: 오퍼 취소
     *     tags: [DEX]
     *     description: 기존에 생성한 오퍼를 취소합니다.
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/OfferCancelRequest'
     *     responses:
     *       200:
     *         description: 오퍼 취소 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 account:
     *                   type: string
     *                   description: 오퍼를 취소한 계정
     *                 offerSequence:
     *                   type: integer
     *                   description: 취소된 오퍼의 시퀀스 번호
     *                 transactionResult:
     *                   type: string
     *                   example: tesSUCCESS
     *       400:
     *         description: 잘못된 요청 또는 오퍼 취소 실패
     *       500:
     *         description: 서버 오류
     */
    this.router.post('/offer/cancel', this.dexController.cancelOffer.bind(this.dexController));

    /**
     * @swagger
     * /api/dex/offer/status/{account}/{sequence}:
     *   get:
     *     summary: 오퍼 상태 확인
     *     tags: [DEX]
     *     description: 특정 오퍼가 활성 상태인지 확인합니다.
     *     parameters:
     *       - in: path
     *         name: account
     *         required: true
     *         schema:
     *           type: string
     *         description: 오퍼를 생성한 계정 주소
     *       - in: path
     *         name: sequence
     *         required: true
     *         schema:
     *           type: integer
     *         description: 확인할 오퍼의 시퀀스 번호
     *     responses:
     *       200:
     *         description: 오퍼 상태 확인 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 exists:
     *                   type: boolean
     *                   description: 오퍼 존재 여부
     *                 status:
     *                   type: string
     *                   description: 오퍼 상태 (active/inactive)
     *       400:
     *         description: 잘못된 요청
     *       500:
     *         description: 서버 오류
     */
    this.router.get('/offer/status/:account/:sequence', this.dexController.checkOfferStatus.bind(this.dexController));

    /**
     * @swagger
     * /api/dex/offer/history/{account}/{sequence}:
     *   get:
     *     summary: 오퍼 히스토리 조회
     *     tags: [DEX]
     *     description: 특정 오퍼와 관련된 트랜잭션 히스토리를 조회합니다.
     *     parameters:
     *       - in: path
     *         name: account
     *         required: true
     *         schema:
     *           type: string
     *         description: 오퍼를 생성한 계정 주소
     *       - in: path
     *         name: sequence
     *         required: true
     *         schema:
     *           type: integer
     *         description: 조회할 오퍼의 시퀀스 번호
     *     responses:
     *       200:
     *         description: 오퍼 히스토리 조회 성공
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 account:
     *                   type: string
     *                   description: 조회한 계정 주소
     *                 offerSequence:
     *                   type: integer
     *                   description: 조회한 오퍼 시퀀스
     *                 transactions:
     *                   type: array
     *                   items:
     *                     type: object
     *                   description: 관련 트랜잭션 목록
     *       400:
     *         description: 잘못된 요청
     *       500:
     *         description: 서버 오류
     */
    this.router.get('/offer/history/:account/:sequence', this.dexController.getOfferHistory.bind(this.dexController));
  }

  public getRouter(): Router {
    return this.router;
  }
} 