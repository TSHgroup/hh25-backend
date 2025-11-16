import { Schema, model } from 'mongoose';

const schema = new Schema({
    code: {
        type: String,
        required: true
    },
    tokenHash: {
        type: String,
        required: true,
    },
    accountId: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
});

export default model('VerificationRequest', schema);