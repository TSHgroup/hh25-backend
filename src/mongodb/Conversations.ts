import { Schema, model } from 'mongoose';

const scoreValidator = (val: number) => {
    return (val >= 0 && val <= 100);
}

const schema = new Schema({
    user: {
        type: Schema.ObjectId,
        required: true,
        ref: "User"
    },
    scenario: {
        type: Schema.ObjectId,
        required: true,
        ref: "Scenario"
    },
    rounds: [
        {
            roundId: {
                type: Schema.ObjectId,
                required: true
            },
            transcript: [
                {
                    side: {
                        type: String,
                        enum: ["AI", "user"]
                    },
                    text: String,
                    emotions: String
                }
            ]
        }
    ],
    stats: {
        emotionScore: {
            type: Number,
            validate: [scoreValidator, '{PATH} must be in range 0 to 100']
        },
        fluencyScore: {
            type: Number,
            validate: [scoreValidator, '{PATH} must be in range 0 to 100']
        },
        wordingScore: {
            type: Number,
            validate: [scoreValidator, '{PATH} must be in range 0 to 100']
        },
    }
});

export default model('Conversations', schema);