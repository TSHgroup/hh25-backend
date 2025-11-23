import { Router } from 'express';

import userRouter from './user';
import user from '../../middlewares/user';
import Scenarios from '../../mongodb/Scenarios';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { ScenarioBody } from '../../models/ScenarioModels';

import models from '../../../data/models.json';
import { PaginatedQuery } from '../../models/GeneralModels';

const router = Router();

router.use('/user', user(), userRouter);

router.get('/', validateQuery(PaginatedQuery), async (req, res) => {
    const { page, limit } = (req as any).validated as Record<string, string>;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const scenarios = await Scenarios.aggregate([
        { $match: { public: true }},
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
    ]);

    res.send({
        result: scenarios,
        page: parsedPage,
        limit: parsedLimit,
        lastPage: Math.ceil((await Scenarios.countDocuments({ public: true })) / parsedLimit),
        firstPage: 1,
        size: scenarios.length,
    });
});

router.get('/:scenarioId', user(), async (req, res) => {
    const { scenarioId } = req.params;
    
    const scenario = await Scenarios.findById(scenarioId);

    if (!scenario) {
        res.status(404).send({
            error: "Scenario not found"
        });
        return;
    }

    if (!scenario.public && scenario.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "This scenario is private"
        });
        return;
    }

    res.send(scenario);
});

router.post('/', user(), validateBody(ScenarioBody), async (req, res) => {
    const { title, subtitle, description, category, tags, languages, status, objectives, persona, openingPrompt, closingPrompt, provider, model, rounds } = req.body;

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
        public: false,
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
        rounds,
    });

    res.send(scenario);
});

router.put('/:scenarioId', user(), validateBody(ScenarioBody), async (req, res) => {
    const { title, subtitle, description, category, tags, languages, status, objectives, persona, openingPrompt, closingPrompt, provider, model, rounds } = req.body;
    const { scenarioId } = req.params;

    const scenario = await Scenarios.findById(scenarioId);

    if (!scenario) {
        res.status(404).send({
            error: "Scenario not found"
        });
        return;
    }

    if (scenario.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only edit your own scenarios"
        });
        return;
    }

    const edited = await Scenarios.findByIdAndUpdate(scenarioId, {
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
        rounds,
    }, {
        new: true,
    });

    res.send(edited);
});

router.post('/:scenarioId/publish', user(), async (req, res) => {
    const { scenarioId } = req.params;

    const scenario = await Scenarios.findById(scenarioId);

    if (!scenario) {
        res.status(404).send({
            error: "Scenario not found"
        });
        return;
    }

    if (scenario.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only publish your own scenarios"
        });
        return;
    }

    const published = await Scenarios.findByIdAndUpdate(scenarioId, {
        public: true
    });

    res.send(published);
});

router.delete('/:scenarioId/publish', user(), async (req, res) => {
    const { scenarioId } = req.params;

    const scenario = await Scenarios.findById(scenarioId);

    if (!scenario) {
        res.status(404).send({
            error: "Scenario not found"
        });
        return;
    }

    if (scenario.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only unpublish your own scenarios"
        });
        return;
    }

    const unpublished = await Scenarios.findByIdAndUpdate(scenarioId, {
        public: false
    });

    res.send(unpublished);
});

router.delete('/:scenarioId', user(), async (req, res) => {
    const { scenarioId } = req.params;

    const scenario = await Scenarios.findById(scenarioId);

    if (!scenario) {
        res.status(404).send({
            error: "Scenario not found"
        });
        return;
    }

    if (scenario.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only delete your own scenarios"
        });
        return;
    }

    const deleted = await Scenarios.findByIdAndDelete(scenarioId);

    res.send(deleted);
});

export default router;