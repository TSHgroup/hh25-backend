import { Request, Response, NextFunction } from "express";
import { ZodError, ZodObject } from "zod";

export const validateBody = (validator: ZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validated = validator.parse(req.body);
            req.body = validated;
            next();
        } catch (error) {
            res.status(400).send({
                errors: (error as ZodError).issues 
            });
        }
    }
}