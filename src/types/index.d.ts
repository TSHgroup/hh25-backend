declare global {
    namespace Express {
        interface User {
            _id: string;
            email: string;
            name: {
                givenName: string;
                familyName: string;
            };
            passwordHash?: string;
            ips: string[];
            refreshTokens: string[];
            emailVerified: boolean;
            googleAccount?: string;
        }
        interface Request {
            user: User | undefined;
        }
    }
}

export {};