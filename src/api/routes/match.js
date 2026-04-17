import { Router } from 'express';
import * as ctrl from '../controllers/match.js';

const router = Router();

router.get('/jobs', ctrl.recommendJobs);
router.get('/workers/:job_uuid', ctrl.recommendWorkers);

export default router;
