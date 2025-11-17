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
        type: [String],
        default: [],
    },
    refreshTokens: {
        type: [String],
        default: [],
    },
    emailVerified: {
        type: Boolean,
        default: false,
    },
    googleAccount: String,
}, {
    timestamps: true
});

export default model('Account', schema);