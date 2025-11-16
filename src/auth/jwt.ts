import passport from 'passport';
import { ExtractJwt, Strategy as JWTStrategy } from 'passport-jwt';
import Accounts from '../mongodb/Accounts';

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken()]),
    secretOrKey: process.env.JWT_SECRET as string
}, async (payload, done) => {
    try {
        const user = await Accounts.findById(payload.id);

        if (user) done(null, user);
        else done(null, false);
    } catch (err) {
        done(err, false);
    }
}))