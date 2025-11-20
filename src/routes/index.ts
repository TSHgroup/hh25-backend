import { Router } from 'express';

import userRoute from './user';
import authRoute from './auth';
import user from '../middlewares/user';
import aiRoute from './ai';
import scenarioRoute from './scenario';
import personaRoute from './persona';

const router = Router();

router.use('/user', user(), userRoute);
router.use('/auth', authRoute);
router.use('/ai', aiRoute);
router.use('/scenario', scenarioRoute);
router.use('/persona', personaRoute);

export default router;