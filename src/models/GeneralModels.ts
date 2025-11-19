import z from "zod";

export const PaginatedQuery = z.object({
    page: z.string()
        .refine((val) => /^\d+$/.test(val))
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1)),
    limit: z.string()
        .refine((val) => /^\d+$/.test(val))
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().min(1).max(100)),
});