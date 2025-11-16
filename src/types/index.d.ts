declare global {
    namespace Express {
        interface User {
            _id: string;
        }
        interface Request {
            user: User | undefined;
        }
    }
}

export {};