import { Schema, model } from "mongoose";

const personaSchema = new Schema({
    name: String,
    role: String,
    personality: String,
    voice: String,
    responseStyle: String,
    informations: String,
    emotionModel: {
        type: {
            baseline: String,
            adapt: Boolean
        }
    },
    maxResponseTokens: {
        type: Number,
        required: true,
        default: 0
    },
    public: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: Schema.ObjectId,
        ref: 'Profile',
        required: true
    },
});

export default model("Persona", personaSchema);