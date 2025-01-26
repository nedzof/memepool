import express from 'express';
import { createMemeVideoMetadata, getMemeVideoMetadata, updateMemeVideoMetadata, deleteMemeVideoMetadata } from '../controllers/metadataController';

const router = express.Router();

router.post('/', createMemeVideoMetadata);
router.get('/:id', getMemeVideoMetadata);
router.put('/:id', updateMemeVideoMetadata);
router.delete('/:id', deleteMemeVideoMetadata);

export default router; 