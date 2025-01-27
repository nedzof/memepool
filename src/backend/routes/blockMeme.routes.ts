import { Router } from 'express';
import blockMemeController from '../controllers/blockMeme.controller';

const router = Router();

// Get current block info including current, upcoming, and past memes
router.get('/current', blockMemeController.getCurrentBlockInfo.bind(blockMemeController));

// Get meme for a specific block
router.get('/block/:blockHeight', blockMemeController.getMemeForBlock.bind(blockMemeController));

// Get upcoming memes
router.get('/upcoming', blockMemeController.getUpcomingMemes.bind(blockMemeController));

// Get past memes
router.get('/past', blockMemeController.getPastMemes.bind(blockMemeController));

// Shift blocks to next block
router.post('/shift', blockMemeController.shiftBlocks.bind(blockMemeController));

// Update block memes (ensure we have enough future memes)
router.post('/update', blockMemeController.updateBlockMemes.bind(blockMemeController));

export default router; 