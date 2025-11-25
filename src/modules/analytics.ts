import { ObjectId } from "mongoose"

export interface Conversation {
    user: ObjectId;
    scenario: ObjectId;
    rounds: {
        roundId: ObjectId;
        transcript: {
            side: "AI" | "user";
            text: string;
            emotions: string;
        }
    };
    stats: {
        emotionScore: number;
        fluencyScore: number;
        wordingScore: number;
    };
    length: number;
    createdAt: number;
}

export interface ConversationAnalysis {
    averageEmotion: number;
    averageFluency: number;
    averageWording: number;
    totalLength: number;
    conversations: number;
}

export const analyzeConversations = (conversations: Conversation[]) => {
    if (conversations.length === 0) {
        return {
            averageEmotion: 0,
            averageFluency: 0,
            averageWording: 0,
            totalLength: 0,
            conversations: 0,
        };
    }

    const totals = conversations.reduce((acc, c) => {
        acc.emotion += c.stats?.emotionScore ?? 0;
        acc.fluency += c.stats?.fluencyScore ?? 0;
        acc.wording += c.stats?.wordingScore ?? 0;
        acc.length += c.length ?? 0;
        return acc;
    }, { emotion: 0, fluency: 0, wording: 0, length: 0 });

    return {
        averageEmotion: totals.emotion / conversations.length,
        averageFluency: totals.fluency / conversations.length,
        averageWording: totals.wording / conversations.length,
        totalLength: totals.length,
        conversations: conversations.length,
    }
}

const getTrend = (a: number, b: number) => (b / a) - 1;

export const calculateTrends = (previous: ConversationAnalysis, current: ConversationAnalysis) => {
    return {
        averageEmotion: getTrend(previous.averageEmotion, current.averageEmotion),
        averageFluency: getTrend(previous.averageFluency, current.averageFluency),
        averageWording: getTrend(previous.averageWording, current.averageWording),
        totalLength: getTrend(previous.totalLength, current.totalLength),
        conversations: getTrend(previous.conversations, current.conversations),
    }
}