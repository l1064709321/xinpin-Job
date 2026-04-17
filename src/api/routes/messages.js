import { Router } from 'express';
import * as ctrl from '../controllers/messages.js';

const router = Router();

router.post('/conversations', ctrl.createConversation);
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:uuid/messages', ctrl.getMessages);
router.post('/conversations/:uuid/messages', ctrl.sendMessage);

export default router;
