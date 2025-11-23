import { Router } from 'express';

import userRoute from './user';
import authRoute from './auth';
import user from '../middlewares/user';
import aiRoute from './ai';
import scenarioRoute from './scenario';
import personaRoute from './persona';
import analyticsRoute from './analytics';

const router = Router();

router.use('/user', user(), userRoute);
router.use('/auth', authRoute);
router.use('/ai', aiRoute);
router.use('/scenario', scenarioRoute);
router.use('/persona', personaRoute);
router.use('/analytics', user(), analyticsRoute);

export default router;