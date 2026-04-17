import { Router } from 'express';
import * as ctrl from '../controllers/applications.js';

const router = Router();

router.post('/', ctrl.apply);
router.get('/my', ctrl.myApplications);
router.get('/received', ctrl.receivedApplications);
router.patch('/:uuid/status', ctrl.updateStatus);

export default router;
