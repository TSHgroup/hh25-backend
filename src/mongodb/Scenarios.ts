import { Schema, model } from 'mongoose';

const minOneValidator = (val: Array<any>) => {
    return val.length > 0;
} 

const scenarioSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    subtitle: String,
    description: String,
    category: {
        type: String,
        enum: ['business', 'education', 'relationships', 'family', 'dates', 'public speaking', 'other'],
        required: true
    },
    tags: [String],
    languages: [String],
    public: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['editing', 'published', 'archived', 'deleted'],
        required: true
    },
    createdBy: {
        type: Schema.ObjectId,
        ref: 'Profile',
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
    persona: {
        type: Schema.ObjectId,
        ref: 'Persona',
        required: true
    },
    openingPrompt: String,
    closingPrompt: String,
    ai: {
        type: {
            provider: {
                type: String,
                required: true,
                default: 'gemini'
            },
            model: {
                type: String,
                required: true,
                default: 'gemini-2.5-flash-native-audio-preview-09-2025'
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

export default model('Scenario', scenarioSchema);