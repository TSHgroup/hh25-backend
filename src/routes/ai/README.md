# AI Conversation WebSocket Endpoint

## Overview
Real-time audio conversation endpoint using Google's Gemini 2.5 Flash Native Audio model. Supports live audio streaming with automatic silence detection.

## Endpoint
```
ws://localhost:3000/v1/ai/conversation
```

## Features
- ✅ Real-time bidirectional audio streaming
- ✅ Automatic 3-minute silence timeout
- ✅ Automatic audio format conversion (16-bit PCM, 16kHz, mono)
- ✅ High-quality audio responses (24kHz)
- ✅ Session management with graceful cleanup

## Message Protocol

### Client → Server

#### 1. Send Audio
```json
{
  "type": "audio",
  "data": "<base64-encoded-wav-file>"
}
```
Audio file will be automatically converted to the required format (16-bit PCM, 16kHz, mono).

#### 2. End Conversation
```json
{
  "type": "end_conversation"
}
```

### Server → Client

#### 1. Session Opened
```json
{
  "type": "session_opened"
}
```
Received when the Gemini session is ready.

#### 2. Audio Response
```json
{
  "type": "audio_response",
  "data": "<base64-encoded-wav-file>"
}
```
Audio response from Gemini (24kHz, 16-bit WAV).

#### 3. Conversation Ended
```json
{
  "type": "conversation_ended",
  "reason": "silence_timeout" | "client_request"
}
```

#### 4. Error
```json
{
  "type": "error",
  "error": "<error-message>"
}
```

## Usage Example

### JavaScript/TypeScript
```typescript
import WebSocket from 'ws';
import * as fs from 'fs';

const ws = new WebSocket('ws://localhost:3000/v1/ai/conversation');

ws.on('open', () => {
    console.log('Connected');
});

ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'session_opened') {
        // Send audio file
        const audioFile = fs.readFileSync('input.wav');
        ws.send(JSON.stringify({
            type: 'audio',
            data: audioFile.toString('base64')
        }));
    }
    
    if (message.type === 'audio_response') {
        // Save response
        const audioBuffer = Buffer.from(message.data, 'base64');
        fs.writeFileSync('response.wav', audioBuffer);
    }
});
```

### Browser
```javascript
const ws = new WebSocket('ws://localhost:3000/v1/ai/conversation');

ws.onopen = () => {
    console.log('Connected');
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (message.type === 'session_opened') {
        // Get audio from microphone or file input
        // Convert to base64 and send
        ws.send(JSON.stringify({
            type: 'audio',
            data: base64AudioData
        }));
    }
    
    if (message.type === 'audio_response') {
        // Play the audio response
        const audioBlob = base64ToBlob(message.data);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
    }
};
```

## Silence Timeout
The conversation automatically ends after **3 minutes of silence** (no audio received from client). When timeout occurs:
1. Server sends `conversation_ended` message with reason `silence_timeout`
2. Connection is closed
3. All resources are cleaned up

The timer resets every time the server receives audio from the client.

## Audio Format Requirements

### Input (Client → Server)
- Format: WAV (any sample rate, bit depth)
- Channels: Mono or Stereo (auto-converted to mono)
- **Automatically converted to**: 16-bit PCM, 16kHz, mono

### Output (Server → Client)
- Format: WAV
- Sample Rate: 24kHz
- Bit Depth: 16-bit
- Channels: Mono

## Error Handling
All errors are sent as JSON messages with type `error`:
```json
{
  "type": "error",
  "error": "Description of what went wrong"
}
```

Common errors:
- Invalid audio format
- Gemini API errors
- Connection issues

## Testing
A test client example is available at `src/routes/ai/client-example.ts`.

To test:
1. Start the server: `npm run dev`
2. Run the test client (uncomment the test function in client-example.ts)
3. Place a WAV file in the path specified in the client
4. Observe the audio response

## Environment Variables
Make sure `GOOGLE_GENAI_API_KEY` is set in your `.env` file:
```
GOOGLE_GENAI_API_KEY=your_api_key_here
```

## Dependencies
- `@google/genai` - Google Generative AI SDK
- `ws` - WebSocket library
- `wavefile` - Audio format conversion
- `express` - HTTP server
