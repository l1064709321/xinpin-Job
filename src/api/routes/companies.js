import { Router } from 'express';
import * as ctrl from '../controllers/companies.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.get('/', ctrl.listCompanies);
router.get('/:uuid', ctrl.getCompany);
router.post('/', authMiddleware, ctrl.createCompany);
router.put('/:uuid', authMiddleware, ctrl.updateCompany);

export default router;
