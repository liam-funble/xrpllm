import { Router } from 'express';
import { LLMController } from './llmController';

const router = Router();
const llmController = new LLMController();

/**
 * @swagger
 * components:
 *   schemas:
 *     LLMResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 요청 성공 여부
 *         message:
 *           type: string
 *           description: 에러 메시지 (실패 시)
 *         response:
 *           type: string
 *           description: LLM의 응답 텍스트
 */

/**
 * @swagger
 * /api/llm/generate:
 *   post:
 *     summary: Generate LLM response
 *     tags: [LLM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - userId
 *               - accounts
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: LLM에 전달할 프롬프트
 *                 example: "밥에게 1000ETH 보내줘"
 *               userId:
 *                 type: string
 *                 description: 요청을 보내는 사용자의 ID
 *                 example: "asdf1234"
 *               accounts:
 *                 type: string
 *                 description: 사용자 계정 주소 목록 (콤마로 구분)
 *                 example: "Me: rwZ4GZR18mKchv41e7DUBobH4iGRUvxK3t, Bob: rKG6Er5J9jXAMyKpDpFryeqtTZUct1T2tp, Alice: rX1y2z3w4v5u"
 *               model:
 *                 type: string
 *                 default: gemma3:27b
 *                 description: 사용할 LLM 모델
 *     responses:
 *       200:
 *         description: 성공적인 응답
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LLMResponse'
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Prompt, userId, or accounts is required
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */

router.post('/generate', llmController.generateResponse.bind(llmController));

export default router;