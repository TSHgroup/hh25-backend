import { Router } from 'express';
import Profiles from '../../mongodb/Profiles';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { ProfileBody } from '../../models/UserModels';
import { PaginatedQuery } from '../../models/GeneralModels';
import Conversations from '../../mongodb/Conversations';

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

router.get('/me/conversations', validateQuery(PaginatedQuery), async (req, res) => {
    const { page, limit } = (req as any).validated as Record<string, string>;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const conversations = await Conversations.aggregate([
        { $match: { user: req.user!._id }},
        { $sort: { createdAt: -1 } },
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
    ]);

    res.send({
        result: conversations,
        page: parsedPage,
        limit: parsedLimit,
        lastPage: Math.ceil((await Conversations.countDocuments({ user: req.user!._id })) / parsedLimit),
        firstPage: 1,
        size: conversations.length,
    });
});

export default router;