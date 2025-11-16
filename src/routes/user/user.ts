import { Router } from 'express';

const router = Router();

router.get('/me', async (req, res) => {
    res.send(req.user);
});

export default router;