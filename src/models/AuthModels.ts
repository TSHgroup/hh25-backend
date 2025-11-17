import z from "zod";

const password = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const RegisterBody = z.object({
    email: z.email(),
    password,
    name: z.object({
        familyName: z.string().min(1).max(50),
        givenName: z.string().min(1).max(50),
    }),
});

export const EmailVerifyBody = z.object({
    token: z.hex()
        .length(64),
    code: z.string()
        .length(6)
        .refine((val) => /^[0-9]{6}$/.test(val)),
});

export const RefreshBody = z.object({
    refreshToken: z.jwt(),
});

export const LoginBody = z.object({
    email: z.email(),
    password,
});