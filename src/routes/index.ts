import { Router } from 'express';

import userRoute from './user';
import authRoute from './auth';
import user from '../middlewares/user';
import aiRoute from "./ai"

const router = Router();

router.use('/user', user(), userRoute);
router.use('/auth', authRoute);
router.use("/ai", aiRoute);

export default router;