import { Router } from 'express';
import passport from 'passport';
import { genericTokenBased } from '../../middlewares/auth';

const router = Router();

router.get('/', passport.authenticate('google'));
router.get('/callback', 
    passport.authenticate('google', { failureRedirect: '/', session: false }),
    genericTokenBased()
);

router.get('/token', 
    passport.authenticate('googleToken', { failureRedirect: '/', session: false }),
    genericTokenBased()
);

export default router;