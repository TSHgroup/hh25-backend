import { Schema, model } from "mongoose";

const minOneValidator = (val: Array<any>) => {
    return val.length > 0;
} 

const scenarioSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: String,
    describtion: String,
    category: {
        type: String,
        enum: ["biznes", "szkoła", "relacje", "rodzina", "randka", "public speaking", "inne"],
        required: true
    },
    tags: [String],
    languages: [String],
    status: {
        type: String,
        enum: ["draft", "editing", "review", "published", "archived", "deleted"],
        required: true
    },
    createdBy: {
        type: Schema.ObjectId,
        ref: "user",
        required: true
    },
    createdAt: {
        type: Date,
        required: true,
        default: () => new Date().toISOString()
    },
    lastUpdatedAt: Date,
    objectives: {
        type: [String],
        required: true,
        validate: [minOneValidator, '{PATH} required at least 1 element']
    },
    aiPersona: {
        type: Schema.ObjectId,
        ref: "persona",
        required: true
    },
    openingPrompt: String,
    closingPrompt: String,
    ai: {
        type: {
            provider: {
                type: String,
                required: true,
                default: "gemini"
            },
            model: {
                type: String,
                required: true,
                default: "gemini-2.5-flash-native-audio-preview-09-2025"
            }
        },
    },
    rounds: [
        {
            prompt: String,
            expectedResponseType: String,
            emotion: String,
            userEmotionTarger: String,
            tips: [String],
            keywordsRequired: [String],
            keywordsBanned: [String]
        }
    ]
})

export default model("scenario", scenarioSchema);