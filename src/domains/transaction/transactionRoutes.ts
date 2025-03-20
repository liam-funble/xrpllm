import { Router } from 'express'
import { TransactionController } from './transactionController'

const router = Router()
const transactionController = new TransactionController()

/**
 * @swagger
 * components:
 *   schemas:
 *     TransactionRequest:
 *       type: object
 *       required:
 *         - fromAddress
 *         - toAddress
 *         - amount
 *         - secret
 *       properties:
 *         fromAddress:
 *           type: string
 *           description: 송금자 주소
 *         toAddress:
 *           type: string
 *           description: 수취인 주소
 *         amount:
 *           type: string
 *           description: 송금할 XRP 수량
 *         secret:
 *           type: string
 *           description: 송금자의 비밀키
 *     Transaction:
 *       type: object
 *       properties:
 *         hash:
 *           type: string
 *         amount:
 *           type: string
 *         fromAddress:
 *           type: string
 *         toAddress:
 *           type: string
 *         timestamp:
 *           type: string
 *         status:
 *           type: string
 *           enum: [success, failed, pending]
 */

/**
 * @swagger
 * /api/transactions/send:
 *   post:
 *     summary: XRP 송금하기
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransactionRequest'
 *     responses:
 *       200:
 *         description: 송금 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 */
router.post('/send', transactionController.sendPayment.bind(transactionController))

/**
 * @swagger
 * /api/transactions/history/{address}:
 *   get:
 *     summary: 주소의 거래 내역 조회
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: XRPL 주소
 *     responses:
 *       200:
 *         description: 거래 내역 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 */
router.get('/history/:address', transactionController.getTransactionHistory.bind(transactionController))

/**
 * @swagger
 * /api/transactions/{hash}:
 *   get:
 *     summary: 특정 거래 상세 정보 조회
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: hash
 *         required: true
 *         schema:
 *           type: string
 *         description: 거래 해시
 *     responses:
 *       200:
 *         description: 거래 상세 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   $ref: '#/components/schemas/Transaction'
 */
router.get('/:hash', transactionController.getTransactionDetails.bind(transactionController))

export default router 