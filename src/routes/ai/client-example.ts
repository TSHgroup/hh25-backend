/**
 * Example WebSocket Client for Audio Conversation
 * 
 * This demonstrates how to connect to the /v1/ai/conversation WebSocket endpoint
 * and stream audio for real-time conversation with Gemini.
 * 
 * Protocol:
 * - Connect to: ws://localhost:3000/v1/ai/conversation
 * - Send: { type: 'audio', data: '<base64-encoded-wav-audio>' }
 * - Receive: { type: 'audio_response', data: '<base64-encoded-wav-audio>' }
 * - Receive: { type: 'session_opened' } when connection is ready
 * - Receive: { type: 'conversation_ended', reason: 'silence_timeout' | 'client_request' }
 * - Receive: { type: 'error', error: '<error-message>' }
 * - Send: { type: 'end_conversation' } to manually end the conversation
 * 
 * Features:
 * - Automatic 3-minute silence timeout
 * - Real-time audio streaming
 * - Audio format: WAV (automatically converted to 16-bit PCM, 16kHz, mono)
 * - Response format: WAV at 24kHz
 */

import WebSocket from 'ws';
import * as fs from 'fs';

const WS_URL = 'ws://localhost:3000/v1/ai/conversation';

async function testConversation() {
    const ws = new WebSocket(WS_URL);

    ws.on('open', () => {
        console.log('Connected to conversation endpoint');
    });

    ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
            case 'session_opened':
                console.log('Session ready, you can start sending audio');
                
                // Example: Send an audio file
                // Uncomment and provide your audio file path
                
                const audioFile = fs.readFileSync('./s1.wav');
                const base64Audio = audioFile.toString('base64');
                
                ws.send(JSON.stringify({
                    type: 'audio',
                    data: base64Audio
                }));
                
                break;

            case 'audio_response':
                console.log('Received audio response');
                // Save the response audio
                const audioBuffer = Buffer.from(message.data, 'base64');
                fs.writeFileSync('response.wav', audioBuffer);
                console.log('Audio saved to response.wav');
                
                // You can send another audio chunk here to continue the conversation
                // Or end the conversation:
                ws.send(JSON.stringify({ type: 'end_conversation' }));
                break;

            case 'conversation_ended':
                console.log(`Conversation ended: ${message.reason}`);
                ws.close();
                break;

            case 'error':
                console.error('Error:', message.error);
                break;

            default:
                console.log('Unknown message type:', message);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

// Uncomment to run the test
testConversation();
