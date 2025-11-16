import { Schema, model } from 'mongoose';

const schema = new Schema({
    name: {
        type: {
            givenName: String,
            familyName: String,
        },
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    passwordHash: String,
    ips: {
        type: Array<String>,
        default: [],
    },
    refreshTokens: {
        type: Array<String>,
        default: [],
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    googleAccount: String,
});

export default model('Account', schema);