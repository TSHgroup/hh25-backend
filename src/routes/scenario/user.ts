import { Router } from 'express';
import Scenarios from '../../mongodb/Scenarios';

const router = Router();

router.get('/me', async (req, res) => {
    const scenarios = await Scenarios.find({
        createdBy: req.user!._id
    });

    res.send(scenarios);
});

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    const scenarios = await Scenarios.find({
        createdBy: userId,
        public: true
    });

    res.send(scenarios);
});

export default router;