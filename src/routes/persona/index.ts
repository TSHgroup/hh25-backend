import { Router } from 'express';
import Personas from '../../mongodb/Personas';
import { validateBody, validateQuery } from '../../middlewares/validate';
import { PaginatedQuery } from '../../models/GeneralModels';
import user from '../../middlewares/user';
import { PersonaBody } from '../../models/PersonaModels';
import userRouter from './user';

const router = Router();

router.use('/user', user(), userRouter);

router.get('/', user(), validateQuery(PaginatedQuery), async (req, res) => {
    const { page, limit } = (req as any).validated as Record<string, string>;

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);

    const personas = await Personas.aggregate([
        { $match: { public: true }},
        { $skip: (parsedPage - 1) * parsedLimit },
        { $limit: parsedLimit }
    ]);

    res.send({
        result: personas,
        page: parsedPage,
        limit: parsedLimit,
        lastPage: Math.ceil((await Personas.countDocuments({ public: true })) / parsedLimit),
        firstPage: 1,
        size: personas.length,
    });
});

router.post('/', user(), validateBody(PersonaBody), async (req, res) => {
    const { name, role, personality, voice, responseStyle, informations, model, adapt, maxResponseTokens} = req.body;

    const persona = await Personas.insertOne({
        createdBy: req.user!._id,
        name,
        role,
        personality,
        voice,
        responseStyle,
        informations,
        emotionModel: {
            baseline: model,
            adapt
        },
        maxResponseTokens,
        public: false
    });

    res.send(persona);
});

router.get('/:personaId', user(), async (req, res) => {
    const { personaId } = req.params;
    
    const persona = await Personas.findOne({
        _id: personaId
    });

    if (!persona) {
        res.status(404).send({
            error: "Persona not found"
        });
        return;
    }

    if (!persona.public && persona.createdBy?.toString() != req.user!._id) {
        res.status(403).send({
            error: "This persona is private"
        });
        return;
    }

    res.send(persona);
});

router.put('/:personaId', user(), validateBody(PersonaBody), async (req, res) => {
    const { name, role, personality, voice, responseStyle, informations, model, adapt, maxResponseTokens} = req.body;
    const { personaId } = req.params;

    const persona = await Personas.findById(personaId);

    if (!persona) {
        res.status(404).send({
            error: "Persona not found"
        });
        return;
    }

    if (persona.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only edit your own personas"
        });
        return;
    }

    const edited = await Personas.findByIdAndUpdate(personaId, {
        createdBy: req.user!._id,
        name,
        role,
        personality,
        voice,
        responseStyle,
        informations,
        emotionModel: {
            baseline: model,
            adapt
        },
        maxResponseTokens,
    }, {
        new: true,
    });

    res.send(edited);
});

router.post('/:personaId/publish', user(), async (req, res) => {
    const { personaId } = req.params;

    const persona = await Personas.findById(personaId);

    if (!persona) {
        res.status(404).send({
            error: "Persona not found"
        });
        return;
    }

    if (persona.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only publish your own personas"
        });
        return;
    }

    const published = await Personas.findByIdAndUpdate(personaId, {
        public: true
    });

    res.send(published);
});

router.delete('/:personaId/publish', user(), async (req, res) => {
    const { personaId } = req.params;

    const persona = await Personas.findById(personaId);

    if (!persona) {
        res.status(404).send({
            error: "Persona not found"
        });
        return;
    }

    if (persona.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only unpublish your own personas"
        });
        return;
    }

    const unpublished = await Personas.findByIdAndUpdate(personaId, {
        public: false
    });

    res.send(unpublished);
});

router.delete('/:personaId', user(), async (req, res) => {
    const { personaId } = req.params;

    const persona = await Personas.findById(personaId);

    if (!persona) {
        res.status(404).send({
            error: "Persona not found"
        });
        return;
    }

    if (persona.createdBy.toString() != req.user!._id) {
        res.status(403).send({
            error: "You can only delete your own personas"
        });
        return;
    }

    const deleted = await Personas.findByIdAndDelete(personaId);

    res.send(deleted);
});

export default router;