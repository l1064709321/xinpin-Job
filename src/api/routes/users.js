import { Router } from 'express';
import * as userController from '../controllers/users.js';

const router = Router();

router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.get('/me/skills', userController.getSkills);
router.put('/me/skills', userController.updateSkills);

export default router;
