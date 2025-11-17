import express from "express";
import { GoogleGenAI, Modality } from '@google/genai';
import * as fs from "node:fs";
import { WaveFile } from 'wavefile';
import { WebSocket } from 'ws';

const router = express.Router();
const ai = new GoogleGenAI({});
const model = "gemini-2.5-flash-native-audio-preview-09-2025"

const SILENCE_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds

interface ConversationSession {
    session: any;
    silenceTimer: NodeJS.Timeout | null;
    ws: WebSocket;
    isActive: boolean;
}

const activeSessions = new Map<WebSocket, ConversationSession>();

async function handleConversationWebSocket(ws: WebSocket) {
    const responseQueue: any[] = [];
    let conversationSession: ConversationSession | null = null;

    async function waitMessage() {
        let done = false;
        let message = undefined;
        while (!done) {
            message = responseQueue.shift();
            if (message) {
                done = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        return message;
    }

    async function handleTurn() {
        const turns = [];
        let done = false;
        while (!done) {
            const message = await waitMessage();
            turns.push(message);
            if (message.serverContent && message.serverContent.turnComplete) {
                done = true;
            }
        }
        return turns;
    }

    function resetSilenceTimer() {
        if (conversationSession?.silenceTimer) {
            clearTimeout(conversationSession.silenceTimer);
        }
        
        if (conversationSession) {
            conversationSession.silenceTimer = setTimeout(() => {
                console.log('3 minutes of silence detected, ending conversation');
                ws.send(JSON.stringify({ 
                    type: 'conversation_ended', 
                    reason: 'silence_timeout' 
                }));
                closeSession();
            }, SILENCE_TIMEOUT);
        }
    }

    function closeSession() {
        if (conversationSession) {
            conversationSession.isActive = false;
            if (conversationSession.silenceTimer) {
                clearTimeout(conversationSession.silenceTimer);
            }
            if (conversationSession.session) {
                conversationSession.session.close();
            }
            activeSessions.delete(ws);
        }
    }

    try {
        const config = {
            responseModalities: [Modality.AUDIO],
            systemInstruction: "You are a helpful assistant and answer in a friendly tone."
        };

        const session = await ai.live.connect({
            model: model,
            callbacks: {
                onopen: function () {
                    console.log('Gemini session opened');
                    ws.send(JSON.stringify({ type: 'session_opened' }));
                },
                onmessage: function (message) {
                    responseQueue.push(message);
                },
                onerror: function (e) {
                    console.error('Gemini error:', e.message);
                    ws.send(JSON.stringify({ type: 'error', error: e.message }));
                },
                onclose: function (e) {
                    console.log('Gemini session closed:', e.reason);
                },
            },
            config: config,
        });

        conversationSession = {
            session,
            silenceTimer: null,
            ws,
            isActive: true
        };

        activeSessions.set(ws, conversationSession);
        resetSilenceTimer();

        // Handle incoming audio from client
        ws.on('message', async (data: Buffer) => {
            if (!conversationSession?.isActive) return;

            resetSilenceTimer();

            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'audio') {
                    console.log("Got audio - conversation");
                    // Process incoming audio
                    const audioData = message.data;
                    
                    // Ensure audio conforms to API requirements (16-bit PCM, 16kHz, mono)
                    const wav = new WaveFile();
                    wav.fromBuffer(Buffer.from(audioData, 'base64'));
                    wav.toSampleRate(16000);
                    wav.toBitDepth("16");
                    const base64Audio = wav.toBase64();

                    // Send to Gemini
                    session.sendRealtimeInput({
                        audio: {
                            data: base64Audio,
                            mimeType: "audio/pcm;rate=16000"
                        }
                    });

                    // Wait for response and stream back
                    const turns = await handleTurn();
                    
                    // Combine audio data strings
                    const combinedAudio = turns.reduce((acc: number[], turn: any) => {
                        if (turn.data) {
                            const buffer = Buffer.from(turn.data, 'base64');
                            const intArray = new Int16Array(
                                buffer.buffer, 
                                buffer.byteOffset, 
                                buffer.byteLength / Int16Array.BYTES_PER_ELEMENT
                            );
                            return acc.concat(Array.from(intArray));
                        }
                        return acc;
                    }, []);

                    if (combinedAudio.length > 0) {
                        const audioBuffer = new Int16Array(combinedAudio);
                        const wf = new WaveFile();
                        wf.fromScratch(1, 24000, '16', audioBuffer);  // output is 24kHz
                        
                        // Send audio response back to client
                        const responseBuffer = Buffer.from(wf.toBuffer());
                        ws.send(JSON.stringify({
                            type: 'audio_response',
                            data: responseBuffer.toString('base64')
                        }));
                    }
                } else if (message.type === 'end_conversation') {
                    ws.send(JSON.stringify({ 
                        type: 'conversation_ended', 
                        reason: 'client_request' 
                    }));
                    closeSession();
                }
            } catch (error: any) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    error: error.message 
                }));
            }
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            closeSession();
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            closeSession();
        });

    } catch (error: any) {
        console.error('Error initializing conversation:', error);
        ws.send(JSON.stringify({ 
            type: 'error', 
            error: error.message 
        }));
        closeSession();
    }
}

router.get("/conversation", async (req, res) => {
    res.status(426).json({
        error: "Upgrade Required",
        message: "This endpoint requires WebSocket connection. Connect using ws:// or wss:// protocol."
    });
});

export { handleConversationWebSocket };
export default router;