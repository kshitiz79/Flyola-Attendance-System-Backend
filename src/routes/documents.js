import express from 'express';
import {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentStats,
  upload
} from '../controllers/documentController.js';
import { protect, adminOnly, adminOrGovernment } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Routes
router.route('/')
  .get(adminOrGovernment, getDocuments)
  .post(adminOnly, upload.single('file'), uploadDocument);

router.get('/stats', adminOrGovernment, getDocumentStats);

router.route('/:id')
  .get(adminOrGovernment, getDocumentById)
  .put(adminOnly, upload.single('file'), updateDocument)
  .delete(adminOnly, deleteDocument);

router.get('/:id/download', adminOrGovernment, downloadDocument);

export default router;