import { Router } from 'express';
import { Client } from 'xrpl';
import { FTController } from './ftController';

export default function ftRoutes(client: Client): Router {
  const router = Router();
  const ftController = new FTController(client);

  /**
   * @swagger
   * /api/ft/issue:
   *   post:
   *     summary: Fungible Token(FT) 발행
   *     description: XRPL에서 Fungible Token을 발행합니다. 새로운 화폐를 만들거나 기존 화폐의 추가 발행에 사용합니다.
   *     tags: [FT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - ft
   *               - secret
   *             properties:
   *               ft:
   *                 type: object
   *                 description: "발행할 FT의 상세 정보"
   *                 properties:
   *                   tokenId: 
   *                     type: string
   *                     description: "토큰의 고유 식별자"
   *                     example: "FT_LAT_001"
   *                   issuer: 
   *                     type: string
   *                     description: "토큰 발행자의 XRPL 주소"
   *                     example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *                   currency: 
   *                     type: string
   *                     description: "화폐 코드 (3글자 ISO 코드 또는 40자 16진수)"
   *                     example: "LAT"
   *                   amount: 
   *                     type: string
   *                     description: "발행할 금액"
   *                     example: "1000.00"
   *                   destination:
   *                     type: string
   *                     description: "토큰을 받을 주소"
   *                     example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *                   flags:
   *                     type: number
   *                     description: "발행 관련 플래그 값"
   *                     example: 0
   *                   fee:
   *                     type: string
   *                     description: "트랜잭션 수수료"
   *                     example: "10"
   *                   memos:
   *                     type: array
   *                     description: "트랜잭션에 추가할 메모"
   *                     items:
   *                       type: object
   *                       properties:
   *                         memo:
   *                           type: object
   *                           properties:
   *                             memoData:
   *                               type: string
   *                               description: "메모 데이터"
   *                               example: "FT Token Test"
   *               secret:
   *                 type: string
   *                 description: "발행자의 비밀 시드"
   *                 example: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm"
   *     responses:
   *       200:
   *         description: FT 발행 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 result:
   *                   type: object
   *                   description: "XRPL 트랜잭션 결과"
   *                 tokenId:
   *                   type: string
   *                   description: "발행된 토큰의 ID"
   *                   example: "FT_LAT_001"
   *       400:
   *         description: 잘못된 요청 또는 발행 실패
   */
  router.post('/issue', ftController.issueFT.bind(ftController));

  /**
   * @swagger
   * /api/ft/issuer/{issuerAddress}:
   *   get:
   *     summary: 특정 발행자의 FT 목록 조회
   *     description: 지정된 발행자가 발행한 모든 FT 목록을 조회합니다.
   *     tags: [FT]
   *     parameters:
   *       - in: path
   *         name: issuerAddress
   *         required: true
   *         description: "조회할 FT 발행자의 XRPL 주소"
   *         schema:
   *           type: string
   *         example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *     responses:
   *       200:
   *         description: FT 목록 조회 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 tokens:
   *                   type: array
   *                   description: "발행된 토큰 목록"
   *       400:
   *         description: 조회 실패 또는 잘못된 요청
   */
  router.get('/issuer/:issuerAddress', ftController.getFTsByIssuer.bind(ftController));

  /**
   * @swagger
   * /api/ft/transfer:
   *   post:
   *     summary: FT 전송
   *     description: 한 계정에서 다른 계정으로 FT를 전송합니다.
   *     tags: [FT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - secret
   *               - receiverAddress
   *               - currency
   *               - issuer
   *               - amount
   *             properties:
   *               secret:
   *                 type: string
   *                 description: "송신자의 비밀 시드"
   *                 example: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm"
   *               receiverAddress:
   *                 type: string
   *                 description: "토큰을 받을 XRPL 주소"
   *                 example: "rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K"
   *               currency:
   *                 type: string
   *                 description: "전송할 화폐 코드"
   *                 example: "LAT"
   *               issuer:
   *                 type: string
   *                 description: "토큰 발행자의 XRPL 주소"
   *                 example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *               amount:
   *                 type: string
   *                 description: "전송할 금액"
   *                 example: "100.00"
   *     responses:
   *       200:
   *         description: FT 전송 성공
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 result:
   *                   type: object
   *                   description: "XRPL 트랜잭션 결과"
   *       400:
   *         description: 전송 실패 또는 잘못된 요청
   */
  router.post('/transfer', ftController.transferFT.bind(ftController));

  /**
   * @swagger
   * /api/ft/trustline:
   *   post:
   *     summary: Trustline(신뢰선) 설정
   *     description: 사용자가 특정 발행자의 토큰을 수락하기 위한 Trustline을 설정합니다.
   *     tags: [FT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - account
   *               - issuer
   *               - currency
   *               - limit
   *               - secret
   *             properties:
   *               account:
   *                 type: string
   *                 description: "Trustline을 설정할 계정 주소"
   *                 example: "rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K"
   *               issuer:
   *                 type: string
   *                 description: "토큰 발행자 주소"
   *                 example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *               currency:
   *                 type: string
   *                 description: "화폐 코드"
   *                 example: "LAT"
   *               limit:
   *                 type: string
   *                 description: "허용할 최대 금액"
   *                 example: "10000"
   *               qualityIn:
   *                 type: number
   *                 description: "입금 품질 (선택 사항)"
   *                 example: 1000000000
   *               qualityOut:
   *                 type: number
   *                 description: "출금 품질 (선택 사항)"
   *                 example: 1000000000
   *               ripplingDisabled:
   *                 type: boolean
   *                 description: "리플링 비활성화 여부 (선택 사항)"
   *                 example: true
   *               noRipple:
   *                 type: boolean
   *                 description: "noRipple 플래그 (선택 사항)"
   *                 example: true
   *               freezeEnabled:
   *                 type: boolean
   *                 description: "동결 활성화 여부 (선택 사항)"
   *                 example: false
   *               secret:
   *                 type: string
   *                 description: "계정의 비밀 시드"
   *                 example: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm"
   *     responses:
   *       200:
   *         description: Trustline 설정 성공
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
   *                   description: "Trustline을 설정한 계정"
   *                 issuer:
   *                   type: string
   *                   description: "토큰 발행자 주소"
   *                 currency:
   *                   type: string
   *                   description: "화폐 코드"
   *                 limit:
   *                   type: string
   *                   description: "설정된 한도"
   *       400:
   *         description: 잘못된 요청 또는 설정 실패
   */
  router.post('/trustline', ftController.setTrustLine.bind(ftController));

  /**
   * @swagger
   * /api/ft/trustlines/{address}:
   *   get:
   *     summary: Trustline 조회
   *     description: 특정 계정의 모든 Trustline 정보를 조회합니다.
   *     tags: [FT]
   *     parameters:
   *       - in: path
   *         name: address
   *         required: true
   *         description: "조회할 계정 주소"
   *         schema:
   *           type: string
   *         example: "rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K"
   *       - in: query
   *         name: currency
   *         required: false
   *         description: "특정 화폐로 필터링 (선택 사항)"
   *         schema:
   *           type: string
   *         example: "LAT"
   *       - in: query
   *         name: issuer
   *         required: false
   *         description: "특정 발행자로 필터링 (선택 사항)"
   *         schema:
   *           type: string
   *         example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *     responses:
   *       200:
   *         description: Trustline 조회 성공
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
   *                   description: "조회한 계정"
   *                 trustlines:
   *                   type: array
   *                   description: "Trustline 목록"
   *       400:
   *         description: 잘못된 요청 또는 조회 실패
   */
  router.get('/trustlines/:address', ftController.getTrustLines.bind(ftController));

  /**
   * @swagger
   * /api/ft/account-options:
   *   post:
   *     summary: 계정의 DefaultRipple 등 설정 변경
   *     description: AccountSet 트랜잭션을 사용하여 DefaultRipple 등 계정 설정을 변경합니다.
   *     tags: [FT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - account
   *               - seed
   *             properties:
   *               account:
   *                 type: string
   *                 description: "설정을 변경할 계정 주소"
   *                 example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *               defaultRipple:
   *                 type: boolean
   *                 description: "DefaultRipple 설정 (활성화/비활성화)"
   *                 example: true
   *               requireDest:
   *                 type: boolean
   *                 description: "목적지 태그 요구 설정 (선택 사항)"
   *                 example: false
   *               requireAuth:
   *                 type: boolean
   *                 description: "인증 요구 설정 (선택 사항)"
   *                 example: false
   *               disallowXRP:
   *                 type: boolean
   *                 description: "XRP 수신 거부 설정 (선택 사항)"
   *                 example: false
   *               transferRate:
   *                 type: number
   *                 description: "전송 수수료 비율 (%), 예: 0.2% = 0.2"
   *                 example: 0.2
   *               domain:
   *                 type: string
   *                 description: "도메인 설정 (선택 사항)"
   *                 example: "example.com"
   *               seed:
   *                 type: string
   *                 description: "계정의 비밀 시드"
   *                 example: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm"
   *     responses:
   *       200:
   *         description: 계정 설정 변경 성공
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
   *                   description: "설정이 변경된 계정"
   *                 defaultRipple:
   *                   type: boolean
   *                   description: "DefaultRipple 설정 상태"
   *       400:
   *         description: 잘못된 요청 또는 설정 실패
   */
  router.post('/account-options', ftController.setAccountOptions.bind(ftController));

  /**
   * @swagger
   * /api/ft/trustline-ripple:
   *   post:
   *     summary: TrustLine의 NoRipple 설정 변경
   *     description: TrustLine의 NoRipple 플래그를 변경하여 리플링 활성화/비활성화합니다.
   *     tags: [FT]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - account
   *               - issuer
   *               - currency
   *               - seed
   *             properties:
   *               account:
   *                 type: string
   *                 description: "TrustLine 소유 계정 주소"
   *                 example: "rLDYrujdKUfVx28T9vRDAbyJ7G2WVXKo4K"
   *               issuer:
   *                 type: string
   *                 description: "토큰 발행자 주소"
   *                 example: "rNo2tAqkdM7g189BjqV9USZo1PtaM6S27t"
   *               currency:
   *                 type: string
   *                 description: "화폐 코드"
   *                 example: "LAT"
   *               limit:
   *                 type: string
   *                 description: "신뢰 한도 (변경 시에만 필요)"
   *                 example: "1000"
   *               noRipple:
   *                 type: boolean
   *                 description: "NoRipple 설정 (false=리플링 활성화, true=리플링 비활성화)"
   *                 example: false
   *               seed:
   *                 type: string
   *                 description: "계정의 비밀 시드"
   *                 example: "sEdTk578DYn1tJCrmiePyNG7N1c4mCm"
   *     responses:
   *       200:
   *         description: TrustLine NoRipple 설정 변경 성공
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
   *                   description: "설정이 변경된 계정"
   *                 issuer:
   *                   type: string
   *                   description: "토큰 발행자"
   *                 currency:
   *                   type: string
   *                   description: "화폐 코드"
   *                 noRipple:
   *                   type: boolean
   *                   description: "NoRipple 설정 상태"
   *       400:
   *         description: 잘못된 요청 또는 설정 실패
   */
  router.post('/trustline-ripple', ftController.setTrustLineNoRipple.bind(ftController));

  return router;
} 