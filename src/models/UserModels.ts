import z from 'zod';
import languages from '../../data/languages.json';

export const ProfileBody = z.object({
    username: z.string()
        .min(1)
        .max(32)
        .refine((val) => /^[a-zA-Z0-9_.]{0,32}$/.test(val))
        .optional(),
    displayName: z.string()
        .min(1)
        .max(32)
        .optional(),
    language: z.literal(languages.map(l => l.code))
        .optional(),
    bio: z.string()
        .min(1)
        .max(512)
        .optional(),
    goals: z.array(z.string()
            .min(1)
            .max(64))
        .min(0)
        .max(5)
        .optional(),
});