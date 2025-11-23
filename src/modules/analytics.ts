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
    const [ averageEmotion, averageFluency, averageWording ] = conversations.map(c => [c.stats.emotionScore, c.stats.fluencyScore, c.stats.wordingScore]).reduce((acc, c) => (acc[0] += c[0], acc[1] += c[1], acc[2] += c[2], acc), [0, 0, 0]).map(t => t / conversations.length);

    const totalLength = conversations.reduce((acc, c) => acc + c.length, 0);

    return {
        averageEmotion,
        averageFluency,
        averageWording,
        totalLength,
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