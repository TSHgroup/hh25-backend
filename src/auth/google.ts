import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as CustomStrategy } from 'passport-custom';
import { OAuth2Client } from 'google-auth-library';
import Accounts from '../mongodb/Accounts';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Accounts.findById(id);
        return done(null, user as unknown as Express.User);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: "/v1/auth/google/callback",
    scope: ['email', 'profile']
}, async (_accessToken, _refreshToken, profile, done) => {
    const { id, name, emails } = profile;
    if (!emails) return done("No email address found", false);
    const email = emails[0].value;

    const account = await Accounts.findOneAndUpdate({
        email
    }, {
        $setOnInsert: {
            name,
        },
        googleAccount: id,
    }, {
        new: true,
        upsert: true
    });

    return done(null, account as unknown as Express.User);
}));

passport.use("googleToken", new CustomStrategy(async (req, done) => {
    const { idToken } = req.body;
    if (!idToken) return done("No ID token", false);

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID!
        });

        const payload = ticket.getPayload();
        if (!payload) return done("Invalid token", false);

        const email = payload.email;
        if (!email) return done("No email address found", false);

        const account = await Accounts.findOneAndUpdate({
            email
        }, {
            $setOnInsert: {
                name: {
                    givenName: payload.given_name,
                    familyName: payload.family_name
                }
            },
            googleAccount: payload.sub,
        }, {
            upsert: true,
            new: true
        });

        done(null, account as unknown as Express.User);
    } catch (err) {
        console.error("Error login in with Google ID token: " + err);
        return done(err, false);
    }
}));