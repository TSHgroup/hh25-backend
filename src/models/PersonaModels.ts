import z from "zod";

// TODO: add string length and integer limits
export const PersonaBody = z.object({
    name: z.string(),
    role: z.string(),
    personality: z.string(),
    voice: z.string(),
    informations: z.string(),
    model: z.string(),
    adapt: z.boolean(),
    maxResponseTokens: z.int(),
});