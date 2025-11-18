import { Router } from 'express';

import userRouter from './user';
import user from '../../middlewares/user';
import Scenarios from '../../mongodb/Scenarios';
import { validateBody } from '../../middlewares/validate';
import { ScenarioBody } from '../../models/ScenarioModels';

import models from '../../../data/models.json';

const router = Router();

router.use('/user', user(), userRouter);

router.post('/', user(), validateBody(ScenarioBody), async (req, res) => {
    const { title, subtitle, description, category, tags, languages, status, objectives, persona, openingPrompt, closingPrompt, provider, model } = req.body;

    if (!(models as Record<string, string[]>)[provider].includes(model)) {
        res.status(400).send({
            error: "Invalid model"
        });
        return;
    }

    const scenario = await Scenarios.insertOne({
        createdBy: req.user!._id,
        title,
        subtitle,
        description,
        category,
        tags,
        languages,
        status,
        lastUpdatedAt: new Date(),
        objectives,
        persona,
        openingPrompt,
        closingPrompt,
        ai: {
            provider,
            model,
        },
        rounds: [],
    });

    res.send(scenario);
});

export default router;