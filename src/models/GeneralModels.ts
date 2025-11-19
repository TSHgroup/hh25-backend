import z from "zod";

export const PaginatedQuery = z.object({
    page: z.int()
        .min(1),
    limit: z.int()
        .min(1)
        .max(100),
});