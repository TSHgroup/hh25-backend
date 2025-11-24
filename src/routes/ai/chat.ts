import { WebSocket } from 'ws';
import { gemini } from '../../modules/ai';
import Conversations from '../../mongodb/Conversations';
import Personas from '../../mongodb/Personas';
import Scenarios from '../../mongodb/Scenarios';
import { Types } from 'mongoose';
import { createUserContent, createPartFromUri } from '@google/genai';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import Handlebars from "handlebars";
import Profiles from '../../mongodb/Profiles';
import Accounts from '../../mongodb/Accounts';

interface ChatMessage {
    type: 'message' | 'audio' | 'start' | 'end';
    content?: string;
    audioData?: string; // Base64 encoded audio
    mimeType?: string; // e.g., 'audio/mp3', 'audio/wav', 'audio/webm'
    userId?: string;
    scenarioId?: string;
    conversationId?: string;
    roundId?: string;
}

interface ChatSession {
    userId: string;
    scenarioId: string;
    conversationId?: string;
    roundId: string;
    chatHistory: string;
    voiceName?: string;
    startTime: number;
}

interface ScoringResult {
    emotionScore: number;
    fluencyScore: number;
    wordingScore: number;
}

const sessions = new Map<WebSocket, ChatSession>();

export async function handleChatWebSocket(ws: WebSocket, userId: string) {
    console.log('New chat WebSocket connection established');

    ws.on('message', async (data: Buffer) => {
        try {
            const message: ChatMessage = JSON.parse(data.toString());

            switch (message.type) {
                case 'start':
                    await handleChatStart(ws, message, userId);
                    break;
                case 'message':
                    await handleChatMessage(ws, message);
                    break;
                case 'audio':
                    await handleAudioMessage(ws, message);
                    break;
                case 'end':
                    await handleChatEnd(ws, message);
                    break;
                default:
                    ws.send(JSON.stringify({ type: 'error', content: 'Unknown message type' }));
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({ 
                type: 'error', 
                content: error instanceof Error ? error.message : 'Unknown error occurred' 
            }));
        }
    });

    ws.on('close', async () => {
        console.log('WebSocket connection closed');
        const session = sessions.get(ws);
        if (session && session.conversationId) {
            // Save any pending conversation data
            await saveConversationTranscript(session);
        }
        sessions.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        sessions.delete(ws);
    });
}

async function handleChatStart(ws: WebSocket, message: ChatMessage, userId: string) {
    if (!message.scenarioId) {
        ws.send(JSON.stringify({ type: 'error', content: 'scenarioId is required' }));
        return;
    }

    // Get scenario
    const scenario = {... await Scenarios.findById(message.scenarioId).populate('persona') };

    // Get round
    const roundId = message.roundId || new Types.ObjectId().toString();
    const currentRound = scenario?.rounds?.find(r => r._id.toString() === roundId);

    const profile = await Profiles.findOne({ account: userId });
    const account = await Accounts.findById(userId);
    console.log("-----------------------------");
    console.log("New conversation started by:");
    console.log(account);
    console.log(profile);
    console.log("On scenario:");
    console.log(scenario);
    console.log("-----------------------------");

    const name = (account as any).name;

    // Get persona
    const persona = { ... scenario?.persona as any };
    const voiceName = persona ? (persona as any).voice : 'Kore';

    const promptRaw = readFileSync(join(process.cwd(), "data", "prompts", "main.prompt"), 'utf-8');
    const prompt = Handlebars.compile(promptRaw);

    const session: ChatSession = {
        userId: userId,
        scenarioId: message.scenarioId,
        roundId: roundId,
        chatHistory: prompt({ persona, scenario, profile, name, currentRound }),
        voiceName: voiceName,
        startTime: Date.now()
    };

    // Create a new conversation document for each chat session
    const conversation = await Conversations.create({
        user: new Types.ObjectId(userId),
        scenario: message.scenarioId,
        rounds: [{
            roundId: new Types.ObjectId(roundId),
            transcript: []
        }]
    });

    session.conversationId = conversation._id.toString();
    sessions.set(ws, session);

    ws.send(JSON.stringify({ 
        type: 'started', 
        conversationId: conversation._id.toString(),
        roundId: roundId
    }));
}

async function handleChatMessage(ws: WebSocket, message: ChatMessage) {
    const session = sessions.get(ws);
    
    if (!session) {
        ws.send(JSON.stringify({ type: 'error', content: 'Chat session not started. Send a "start" message first.' }));
        return;
    }

    if (!message.content) {
        ws.send(JSON.stringify({ type: 'error', content: 'Message content is required' }));
        return;
    }

    try {
        // Add user message to history
        session.chatHistory += `User: ${message.content}\n`;

        // Send to Gemini API
        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: session.chatHistory,
            config: {
                thinkingConfig: {
                    thinkingBudget: 0
                }
            }
        });

        const aiResponse = response.text || '';

        // Add AI response to history
        session.chatHistory += `Assistant: ${aiResponse}\n`;

        // Generate audio response
        const audioResult = await generateAudioResponse(aiResponse, session.voiceName);

        // Analyze user communication for scoring (text-based)
        const scores = await analyzeUserCommunication(undefined, message.content);

        // Save to database with scores
        await Conversations.findOneAndUpdate(
            {
                _id: session.conversationId,
                'rounds.roundId': session.roundId
            },
            {
                $push: {
                    'rounds.$.transcript': [
                        {
                            side: 'user',
                            text: message.content,
                            emotions: ''
                        },
                        {
                            side: 'AI',
                            text: aiResponse,
                            emotions: ''
                        }
                    ]
                },
                $set: {
                    'stats.emotionScore': scores.emotionScore,
                    'stats.fluencyScore': scores.fluencyScore,
                    'stats.wordingScore': scores.wordingScore
                }
            }
        );

        // Send AI response back to client (always send text, include error if audio failed)
        const responseMessage: any = { 
            type: 'response', 
            content: aiResponse
        };
        
        if (audioResult.audio) {
            responseMessage.audio = audioResult.audio;
        } else {
            responseMessage.audioError = audioResult.error || 'Failed to generate audio';
        }
        
        ws.send(JSON.stringify(responseMessage));

    } catch (error) {
        console.error('Error in chat message:', error);
        ws.send(JSON.stringify({ 
            type: 'error', 
            content: error instanceof Error ? error.message : 'Failed to process message' 
        }));
    }
}

async function handleChatEnd(ws: WebSocket, message: ChatMessage) {
    const session = sessions.get(ws);
    
    if (!session) {
        ws.send(JSON.stringify({ type: 'error', content: 'No active chat session' }));
        return;
    }

    await saveConversationTranscript(session);

    sessions.delete(ws);
    ws.send(JSON.stringify({ type: 'ended', content: 'Chat session ended successfully' }));
}

async function handleAudioMessage(ws: WebSocket, message: ChatMessage) {
    const session = sessions.get(ws);
    
    if (!session) {
        ws.send(JSON.stringify({ type: 'error', content: 'Chat session not started. Send a "start" message first.' }));
        return;
    }

    if (!message.audioData) {
        ws.send(JSON.stringify({ type: 'error', content: 'Audio data is required' }));
        return;
    }

    try {
        // Determine file extension from mimeType
        const mimeType = message.mimeType || 'audio/webm';
        const extension = mimeType.split('/')[1] || 'webm';
        
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'uploads', 'audio');
        if (!existsSync(uploadsDir)) {
            await mkdir(uploadsDir, { recursive: true });
        }

        // Save audio file
        const fileName = `${session.userId}_${Date.now()}.${extension}`;
        const filePath = join(uploadsDir, fileName);
        
        // Decode base64 and save
        const audioBuffer = Buffer.from(message.audioData, 'base64');
        await writeFile(filePath, audioBuffer);

        // Upload to Gemini for transcription
        const uploadedFile = await gemini.files.upload({
            file: filePath,
            config: { mimeType: mimeType }
        });

        // Transcribe audio to text
        const transcriptionResponse = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: createUserContent([
                createPartFromUri(uploadedFile.uri || '', uploadedFile.mimeType || mimeType),
                "Transcribe this audio to text. Only provide the transcription, nothing else."
            ]),
            config: {
                thinkingConfig: {
                    thinkingBudget: 0
                }
            }
        });

        const transcribedText = transcriptionResponse.text || '[Unable to transcribe audio]';

        // Add transcribed text to chat history
        session.chatHistory += `User: ${transcribedText}\n`;

        // Send transcribed text to Gemini for response
        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: session.chatHistory,
            config: {
                thinkingConfig: {
                    thinkingBudget: 0
                }
            }
        });

        const aiResponse = response.text || '';

        // Add AI response to history
        session.chatHistory += `Assistant: ${aiResponse}\n`;

        // Generate audio response
        const audioResult = await generateAudioResponse(aiResponse, session.voiceName);

        // Analyze user communication for scoring (audio-based)
        const scores = await analyzeUserCommunication(
            uploadedFile.uri,
            transcribedText,
            uploadedFile.mimeType || mimeType
        );

        // Save to database with transcribed text and scores
        await Conversations.findOneAndUpdate(
            {
                _id: session.conversationId,
                'rounds.roundId': session.roundId
            },
            {
                $push: {
                    'rounds.$.transcript': [
                        {
                            side: 'user',
                            text: transcribedText,
                            emotions: ''
                        },
                        {
                            side: 'AI',
                            text: aiResponse,
                            emotions: ''
                        }
                    ]
                },
                $set: {
                    'stats.emotionScore': scores.emotionScore,
                    'stats.fluencyScore': scores.fluencyScore,
                    'stats.wordingScore': scores.wordingScore
                }
            }
        );

        // Send transcription and AI response back to client
        ws.send(JSON.stringify({ 
            type: 'transcription',
            content: transcribedText 
        }));

        // Always send text response, include error if audio failed
        const responseMessage: any = { 
            type: 'response', 
            content: aiResponse
        };
        
        if (audioResult.audio) {
            responseMessage.audio = audioResult.audio;
        } else {
            responseMessage.audioError = audioResult.error || 'Failed to generate audio';
        }
        
        ws.send(JSON.stringify(responseMessage));

    } catch (error) {
        console.error('Error in audio message:', error);
        ws.send(JSON.stringify({ 
            type: 'error', 
            content: error instanceof Error ? error.message : 'Failed to process audio' 
        }));
    }
}

async function generateAudioResponse(text: string, voiceName: string = 'Kore'): Promise<{ audio: string | null; error?: string }> {
    try {
        // Use a conversational prompt for better TTS quality
        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ 
                parts: [{ 
                    text: `Say naturally and conversationally: ${text}` 
                }] 
            }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) {
            return { audio: null, error: 'No audio data returned from API' };
        }
        return { audio: audioData };
    } catch (error) {
        console.error('Error generating audio:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { audio: null, error: errorMessage };
    }
}

/**
 * Analyzes user communication for emotion, fluency, and wording quality
 * @param audioUri - Optional Gemini file URI for audio analysis
 * @param text - Text content to analyze (used if no audio provided)
 * @param audioMimeType - MIME type of the audio file
 * @returns Scores for emotion, fluency, and wording (0-100)
 */
async function analyzeUserCommunication(audioUri?: string, text?: string, audioMimeType?: string): Promise<ScoringResult> {
    try {
        const analysisPrompt = readFileSync(join(process.cwd(), 'data', 'prompts', 'analysis.prompt'), 'utf-8');

        let contentParts: any[];
        
        if (audioUri && audioMimeType) {
            // Analyze from audio
            contentParts = [
                createPartFromUri(audioUri, audioMimeType),
                analysisPrompt
            ];
        } else if (text) {
            // Analyze from text
            contentParts = [
                `User said: "${text}"\n\n${analysisPrompt}`
            ];
        } else {
            throw new Error('Either audioUri or text must be provided for analysis');
        }

        const response = await gemini.models.generateContent({
            model: "gemini-2.5-flash",
            contents: createUserContent(contentParts),
            config: {
                thinkingConfig: {
                    thinkingBudget: 0
                },
                responseMimeType: 'application/json'
            }
        });

        const responseText = response.text || '{}';
        const scores = JSON.parse(responseText) as ScoringResult;
        
        // Validate and clamp scores to 0-100 range
        const emotionScore = Math.max(0, Math.min(100, Math.round(scores.emotionScore || 50)));
        const fluencyScore = Math.max(0, Math.min(100, Math.round(scores.fluencyScore || 50)));
        const wordingScore = Math.max(0, Math.min(100, Math.round(scores.wordingScore || 50)));
        
        return { emotionScore, fluencyScore, wordingScore };
    } catch (error) {
        console.error('Error analyzing user communication:', error);
        // Return default scores on error
        return { emotionScore: 50, fluencyScore: 50, wordingScore: 50 };
    }
}

async function saveConversationTranscript(session: ChatSession) {
    // Calculate conversation length in seconds
    const endTime = Date.now();
    const lengthInSeconds = Math.floor((endTime - session.startTime) / 1000);
    
    // Update conversation with length
    await Conversations.findByIdAndUpdate(
        session.conversationId,
        { length: lengthInSeconds }
    );
    
    console.log(`Saving conversation for user ${session.userId}, round ${session.roundId}, length: ${lengthInSeconds}s`);
}
