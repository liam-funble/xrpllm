import { Router } from 'express';
import { NFTController } from './nftController';

const router = Router();
const nftController = new NFTController();

/**
 * @swagger
 * components:
 *   schemas:
 *     NFTMintRequest:
 *       type: object
 *       required:
 *         - issuerAddress
 *         - secret
 *         - uri
 *       properties:
 *         issuerAddress:
 *           type: string
 *           description: NFT 발행자의 XRPL 주소
 *         secret:
 *           type: string
 *           description: 발행자의 비밀키
 *         uri:
 *           type: string
 *           description: NFT 메타데이터 URI
 *         flags:
 *           type: number
 *           description: NFT 플래그 (선택사항)
 *         transferFee:
 *           type: number
 *           description: 전송 수수료 (선택사항)
 *         taxon:
 *           type: number
 *           description: NFT 분류 번호 (선택사항)
 */

/**
 * @swagger
 * /api/nft/mint:
 *   post:
 *     summary: NFT 발행
 *     tags: [NFT]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NFTMintRequest'
 *     responses:
 *       200:
 *         description: NFT 발행 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 nft:
 *                   type: object
 *                   properties:
 *                     tokenId:
 *                       type: string
 *                     issuer:
 *                       type: string
 *                     uri:
 *                       type: string
 *                     flags:
 *                       type: number
 *                     transferFee:
 *                       type: number
 *                     taxon:
 *                       type: number
 */
router.post('/mint', nftController.mintNFT.bind(nftController));

export default router; 