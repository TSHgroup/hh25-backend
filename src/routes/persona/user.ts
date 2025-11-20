import { Router } from 'express';
import Personas from '../../mongodb/Personas';

const router = Router();

router.get('/me', async (req, res) => {
    const personas = await Personas.find({
        createdBy: req.user!._id
    });

    res.send(personas);
});

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    const personas = await Personas.find({
        createdBy: userId,
        public: true
    });

    res.send(personas);
});

export default router;