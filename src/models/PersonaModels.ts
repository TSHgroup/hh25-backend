import z from "zod";
import voices from '../../data/voices.json';

// TODO: add string length and integer limits
export const PersonaBody = z.object({
    name: z.string(),
    role: z.string(),
    personality: z.string(),
    voice: z.literal(voices.map(v => v.name)),
    informations: z.string(),
    model: z.string(),
    adapt: z.boolean(),
    maxResponseTokens: z.int(),
});