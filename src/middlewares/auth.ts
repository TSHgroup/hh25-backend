import { Request, Response } from "express"
import { generateAccessToken, generateRefreshToken, hashToken } from "../auth/crypto";
import Accounts from "../mongodb/Accounts";

export const genericTokenBased = () => {
    return async (req: Request, res: Response) => {
        if (!req.user) {
            res.status(401).send({
                error: "User is not authorized"
            });
            return;
        }
    
        const accessToken = generateAccessToken(req.user._id.toString());
        const refreshToken = generateRefreshToken(req.user._id.toString());
    
        await Accounts.updateOne(
            { _id: req.user._id },
            {
                $addToSet: {
                    refreshTokens: await hashToken(refreshToken),
                    ips: req.ip
                }
            }
        );
    
        res.send({
            accessToken,
            refreshToken,
            emailVerified: req.user.emailVerified,
        });
    }
}