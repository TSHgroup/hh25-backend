import z from 'zod';
import languages from '../../data/languages.json';
import models from '../../data/models.json';

export const ScenarioBody = z.object({
    title: z.string()
        .min(1)
        .max(130),
    subtitle: z.string()
        .min(1)
        .max(200)
        .optional(),
    description: z.string()
        .min(1)
        .max(512)
        .optional(),
    category: z.string()
        .min(1)
        .max(50),
    tags: z.array(z.string().min(1).max(50))
        .min(0)
        .max(5)
        .optional(),
    languages: z.array(z.literal(languages.map(l => l.code)))
        .min(1)
        .max(5)
        .optional(),
    status: z.literal(['editing', 'published', 'archived', 'deleted']),
    objectives: z.array(z.string().min(1).max(200))
        .min(1)
        .max(5),
    persona: z.hex()
        .length(24),
    openingPrompt: z.string()
        .min(1)
        .max(300)
        .optional(),
    closingPrompt: z.string()
        .min(1)
        .max(300)
        .optional(),
    provider: z.literal(Object.keys(models)),
    model: z.literal(Object.values(models).flat()),
});