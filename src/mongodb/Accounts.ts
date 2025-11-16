import { Schema, model } from 'mongoose';

const schema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
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
});

export default model('Account', schema);