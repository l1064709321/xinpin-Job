import { Router } from 'express';
import * as jobController from '../controllers/jobs.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 公开
router.get('/', jobController.listJobs);
router.get('/search', jobController.searchJobs);
router.get('/:uuid', jobController.getJob);

// 需认证
router.post('/', authMiddleware, jobController.createJob);
router.put('/:uuid', authMiddleware, jobController.updateJob);
router.patch('/:uuid/status', authMiddleware, jobController.updateJobStatus);
router.get('/my/list', authMiddleware, jobController.myJobs);

export default router;
