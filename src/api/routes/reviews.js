import { Router } from 'express';
import * as ctrl from '../controllers/reviews.js';

const router = Router();

router.post('/', ctrl.createReview);
router.get('/target/:type/:uuid', ctrl.getTargetReviews);

export default router;
