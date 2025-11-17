import { Router } from 'express';
import user from '../../middlewares/user';
import Accounts from '../../mongodb/Accounts';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, generateVerificationCode, generateVerificationToken, hashToken, secureCompare } from '../../auth/crypto';
import VerificationRequests from '../../mongodb/VerificationRequests';
import jwt from "jsonwebtoken";
import { sendTemplate } from '../../mail/mailer';

import googleRoute from "./google";
import { validateBody } from '../../middlewares/validate';
import { EmailVerifyBody, LoginBody, RefreshBody, RegisterBody } from '../../models/AuthModels';

const router = Router();

router.use("/google", googleRoute);

router.post('/register', validateBody(RegisterBody), async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const ip = req.ip;

        if (await Accounts.exists({ email })) {
            res.status(400).send({ error: "Duplicate email address" });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const account = await Accounts.insertOne({
            name,
            email,
            passwordHash,
            refreshTokens: [],
            ips: [ ip ],
        });

        const accessToken = generateAccessToken(account._id.toString());
        const refreshToken = generateRefreshToken(account._id.toString());
        
        await Accounts.updateOne(
            { _id: account._id },
            { $push: { refreshTokens: await hashToken(refreshToken) }}
        );

        const verificationCode = generateVerificationCode();
        const verificationToken = generateVerificationToken();
        const verificationHash = await hashToken(verificationToken);

        await VerificationRequests.insertOne({
            accountId: account._id,
            tokenHash: verificationHash,
            code: verificationCode,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        sendTemplate(email, "Verify your account", 'auth/verification', {
            code: verificationCode
        });
        
        res.status(201).send({
            accessToken,
            refreshToken,
            verificationToken,
            message: "Account created. Check your email for verification code.",
        });
    } catch (error) {
        console.error("Registration error: " + error);
        res.status(500).send({ error: "Internal server error" });
    }
});

router.post('/emailVerify', user(), async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).send({ error: "User not logged in" });
            return;
        }
        const accountId = req.user._id;

        const account = await Accounts.findById(accountId);
        if (!account) {
            res.status(404).send({ error: "Account not found" });
            return;
        }

        if (account.emailVerified) {
            res.status(400).send({ error: "Email already verified" });
            return;
        }

        await VerificationRequests.deleteMany({ accountId })

        const verificationCode = generateVerificationCode();
        const verificationToken = generateVerificationToken();
        const verificationHash = await hashToken(verificationToken);

        await VerificationRequests.insertOne({
            accountId,
            tokenHash: verificationHash,
            code: verificationCode,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        sendTemplate(account.email, "Verify your account", 'auth/verification', {
            code: verificationCode
        });
        
        res.send({
            verificationToken,
            message: "Verification email sent"
        });
    } catch (error) {
        console.error("Email verification error: " + error);
        res.status(500).send({ error: "Internal server error" });
    }
});

router.put('/emailVerify', validateBody(EmailVerifyBody), async (req, res) => {
    try {
        const { token, code } = req.body;

        const requests = await VerificationRequests.find({ expiresAt: { $gt: new Date() } });

        let matched = null;
        for (const request of requests) {
            if (await bcrypt.compare(token, request.tokenHash)) {
                matched = request;
                break;
            }
        }

        if (!matched) {
            res.status(400).send({ error: "Invalid or expired verification token" });
            return;
        }

        if (!secureCompare(code, matched.code)) {
            res.status(400).send({ error: "Invalid verification code" });
            return;
        }

        await Promise.all([
            Accounts.updateOne(
                { _id: matched.accountId },
                { $set: { emailVerified: true } }
            ),
            VerificationRequests.deleteOne({ _id: matched._id }),
            VerificationRequests.deleteMany({ expiresAt: { $lt: new Date() } }),
        ]);

        res.send({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Email verification error: ", error);
        res.status(500).send({ error: "Internal server error" });
    }
});

router.post('/refresh', validateBody(RefreshBody), async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { accountId: string, type: string };
        if (decoded.type !== 'refresh') {
            res.status(401).send({ error: "Invalid refresh token" });
            return;
        }

        const account = await Accounts.findById(decoded.accountId);
        if (!account) {
            res.status(401).send({ error: "Invalid refresh token" });
            return;
        }

        let valid = false;
        for (const storedHash of account.refreshTokens) {
            if (await bcrypt.compare(refreshToken, storedHash)) {
                valid = true;
                break;
            }
        }

        if (!valid) {
            res.status(401).send({ error: "Refresh token revoked or invalid" });
            return;
        }

        const newAccessToken = generateAccessToken(decoded.accountId);
        const newRefreshToken = generateRefreshToken(decoded.accountId);
        const refreshHash = await hashToken(newRefreshToken);

        const refreshTokens = account.refreshTokens;
        const filteredTokens = [];

        for (const storedToken of refreshTokens) {
            if (!await bcrypt.compare(refreshToken, storedToken)) {
                filteredTokens.push(storedToken);
            }
        }

        filteredTokens.push(refreshHash);

        await Accounts.updateOne(
            { _id: decoded.accountId },
            { $set: { refreshTokens: filteredTokens } }
        );

        res.send({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error("Refresh error: " + error);
        res.status(500).send({ error: "Internal server error" });
    }
});

router.post('/login', validateBody(LoginBody), async (req, res) => {
    try {
        const { email, password } = req.body;

        const account = await Accounts.findOne({ email });
        if (!account) {
            res.status(401).send({ error: "Invalid credentials" });
            return;
        }

        // if the account doesn't have a password, it has to be an OAuth2 account
        if (!account.passwordHash) {
            res.status(400).send({ error: "Unsupported auth flow" });
            return;
        }

        if(!await bcrypt.compare(password, account.passwordHash)) {
            res.status(401).send({ error: "Invalid credentials" });
            return;
        }

        const accessToken = generateAccessToken(account._id.toString());
        const refreshToken = generateRefreshToken(account._id.toString());

        await Accounts.updateOne(
            { _id: account._id },
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
            emailVerified: account.emailVerified,
        });
    } catch (error) {
        console.error("Login error: " + error);
        res.status(500).send({ error: "Internal server error" });
    }
});

export default router;