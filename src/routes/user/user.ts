import { Router } from 'express';
import Profiles from '../../mongodb/Profiles';
import { validateBody } from '../../middlewares/validate';
import { ProfileBody } from '../../models/UserModels';

const router = Router();

router.get('/me', async (req, res) => {
    const profile = await Profiles.findOneAndUpdate({ account: req.user!._id }, {}, { upsert: true, new: true });
    res.send({
        account: {
            _id: req.user!._id,
            email: req.user!.email,
            emailVerified: req.user!.emailVerified,
            name: req.user!.name
        },
        profile: profile || null
    });
});

router.put('/profile', validateBody(ProfileBody), async (req, res) => {
    const { username, displayName, language, bio, goals } = req.body;
    
    const profile = await Profiles.findOneAndUpdate(
        { account: req.user!._id },
        { username, displayName, language, bio, goals },
        { new: true, upsert: true }
    );
    
    res.send(profile);
});

export default router;