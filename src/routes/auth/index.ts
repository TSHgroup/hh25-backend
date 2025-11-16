import { Router } from 'express';
import user from '../../middlewares/user';
import Accounts from '../../mongodb/Accounts';
import bcrypt from 'bcrypt';
import { generateAccessToken, generateRefreshToken, generateVerificationCode, generateVerificationToken, hashToken, secureCompare } from '../../auth/crypto';
import VerificationRequests from '../../mongodb/VerificationRequests';
import jwt from "jsonwebtoken";
import { sendTemplate } from '../../mail/mailer';

const router = Router();

// TODO: add body validation
router.post('/register', async (req, res) => {
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

// TODO: add body validation
router.post('/emailVerify', user(), async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).send({ error: "User not logged in" });
            return;
        }
        // @ts-ignore
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

// TODO: add body validation
router.put('/emailVerify', async (req, res) => {
    try {
        const { token, code } = req.body;

        const tokenHash = await hashToken(token);

        const verificationRequest = await VerificationRequests.findOne({
            tokenHash,
            expiresAt: { $gt: new Date() }
        });

        if (!verificationRequest) {
            res.status(400).send({ error: "Invalid or expired verification token" });
            return;
        }

        if (!secureCompare(code, verificationRequest.code)) {
            res.status(400).send({ error: "Invalid verification code" });
            return;
        }

        await Promise.all([
            Accounts.updateOne(
                { _id: verificationRequest.accountId },
                { $set: { emailVerified: true } }
            ),
            VerificationRequests.deleteOne({ _id: verificationRequest._id })
        ]);

        res.send({ message: "Email verified successfully" });
    } catch (error) {
        console.error("Email verification error: ", error);
        res.status(500).send({ error: "Internal server error" });
    }
});

// TODO: add body validation
router.post('/refresh', async (req, res) => {
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
        // @ts-ignore
        for (const storedHash of Array.from(account.refreshTokens || []) as string[]) {
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

        // @ts-ignore
        for (const storedToken of Array.from(refreshTokens || []) as string[]) {
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

// TODO: add body validation
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const account = await Accounts.findOne({ email });
        if (!account) {
            res.status(401).send({ error: "Invalid credentials" });
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