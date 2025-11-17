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
}, {
    timestamps: true
});

export default model("Profile", schema);