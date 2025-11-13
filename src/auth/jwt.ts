import passport from "passport";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";

passport.use(new JWTStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken()]),
    secretOrKey: process.env.JWT_SECRET as string
}, async (payload, done) => {
    try {
        // TODO
    } catch (err) {
        done(err, false);
    }
}))