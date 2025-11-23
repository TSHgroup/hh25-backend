import z from "zod";

export const AnalyticsQuery = z.object({
    span: z.string().regex(/^\d+(?:ms|s|m|h|d|w|y)$/, "Invalid time span format")
})