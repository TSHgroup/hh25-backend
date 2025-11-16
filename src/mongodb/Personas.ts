import { Schema, model } from "mongoose";

const personaSchema = new Schema({
    name: String,
    role: String,
    personality: String,
    voice: String,
    responseStyle: String,
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
    }
})

export default model("Persona", personaSchema);