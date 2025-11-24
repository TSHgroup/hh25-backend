import z from 'zod';
import languages from '../../data/languages.json';
import models from '../../data/models.json';

export const ScenarioBody = z.object({
    title: z.string()
        .min(1)
        .max(200),
    subtitle: z.string()
        .min(1)
        .max(400)
        .optional(),
    description: z.string()
        .min(1)
        .max(1000)
        .optional(),
    category: z.string()
        .min(1)
        .max(50),
    tags: z.array(z.string().min(1).max(50))
        .min(0)
        .max(10)
        .optional(),
    languages: z.array(z.literal(languages.map(l => l.code)))
        .min(1)
        .max(5)
        .optional(),
    status: z.literal(['editing', 'published', 'archived', 'deleted']),
    objectives: z.array(z.string().min(1).max(200))
        .min(1)
        .max(10),
    persona: z.hex()
        .length(24),
    openingPrompt: z.string()
        .min(1)
        .max(1000)
        .optional(),
    closingPrompt: z.string()
        .min(1)
        .max(1000)
        .optional(),
    provider: z.literal(Object.keys(models)),
    model: z.literal(Object.values(models).flat()),
    rounds: z.array(z.object({
        prompt: z.string()
            .min(1),
        expectedResponseType: z.string()
            .min(1)
            .optional(),
        emotion: z.string()
            .min(1)
            .optional(),
        userEmotionTarget: z.string()
            .min(1)
            .optional(),
        tips: z.array(z.string().min(1))
            .optional(),
        keywordsRequired: z.array(z.string().min(1))
            .optional(),
        keywordsBanned: z.array(z.string().min(1))
            .optional()
    })).min(1)
});