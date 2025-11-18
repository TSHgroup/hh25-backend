import { Router } from 'express';

import userRouter from './user';
import user from '../../middlewares/user';

const router = Router();

router.use('/user', user(), userRouter);

export default router;