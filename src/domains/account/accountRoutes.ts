import { Router } from 'express'
import { AccountController } from './accountController'

const router = Router()
const accountController = new AccountController()

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           description: XRPL 주소
 *         secret:
 *           type: string
 *           description: 계정 비밀키
 *         balance:
 *           type: string
 *           description: XRP 잔액
 */

/**
 * @swagger
 * /api/accounts/create:
 *   post:
 *     summary: 새 계정 생성
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: 계정 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 account:
 *                   $ref: '#/components/schemas/Account'
 */
router.post('/create', accountController.createAccount.bind(accountController))

/**
 * @swagger
 * /api/accounts/{address}:
 *   get:
 *     summary: 계정 정보 조회
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: XRPL 주소
 *     responses:
 *       200:
 *         description: 계정 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 account:
 *                   $ref: '#/components/schemas/Account'
 */
router.get('/:address', accountController.getAccountInfo.bind(accountController))

export default router 