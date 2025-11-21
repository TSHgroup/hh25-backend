import { Schema, model } from "mongoose";
import languages from "../../data/languages.json";

const schema = new Schema({
    account: {
        type: Schema.ObjectId,
        ref: "Account",
        required: true,
        unique: true
    },
    username: {
        type: String,
        unique: true,
        sparse: true
    },
    displayName: String,
    avatarHash: String,
    avatarURL: String,
    language: {
        type: String,
        enum: languages.map(l => l.code),
        default: "pl"
    },
    goals: [String],
    bio: String,
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
    },
}, {
    timestamps: true
});

export default model("Profile", schema);