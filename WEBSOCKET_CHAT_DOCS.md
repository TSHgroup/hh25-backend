# Gemini WebSocket Chat with Audio Support

## Overview
WebSocket-based real-time chat system that integrates with Google's Gemini AI, supporting both text and audio messages.

## WebSocket Endpoint
```
ws://localhost:3000/v1/ai/chat?token=YOUR_JWT_TOKEN
```

## Message Types

### From Client to Server

#### 1. Start Chat Session
```json
{
  "type": "start",
  "scenarioId": "your_scenario_id"
}
```

#### 2. Send Text Message
```json
{
  "type": "message",
  "content": "Your message here"
}
```

#### 3. Send Audio Message
```json
{
  "type": "audio",
  "audioData": "base64_encoded_audio_data",
  "mimeType": "audio/mp3"
}
```
Supported audio formats: `audio/mp3`, `audio/wav`, `audio/webm`, `audio/ogg`

#### 4. End Chat Session
```json
{
  "type": "end"
}
```

### From Server to Client

#### Started
```json
{
  "type": "started",
  "conversationId": "conversation_id",
  "roundId": "round_id"
}
```

#### Response
```json
{
  "type": "response",
  "content": "AI response text",
  "audio": "base64_encoded_pcm_audio_data"
}
```
The `audio` field contains base64-encoded PCM audio (24kHz, 16-bit, mono) generated with the voice from the persona settings.

#### Transcription (for audio messages)
```json
{
  "type": "transcription",
  "content": "Transcribed text from audio"
}
```

#### Error
```json
{
  "type": "error",
  "content": "Error message"
}
```

#### Ended
```json
{
  "type": "ended",
  "content": "Chat session ended successfully"
}
```

## Frontend Implementation Examples

### JavaScript/TypeScript

```typescript
// Connect to WebSocket
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:3000/v1/ai/chat?token=${token}`);

ws.onopen = () => {
  // Start chat session
  ws.send(JSON.stringify({
    type: 'start',
    scenarioId: 'YOUR_SCENARIO_ID'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  if (data.type === 'response') {
    console.log('AI says:', data.content);
    
    // Play audio if available
    if (data.audio) {
      playAudioResponse(data.audio);
    }
  }
};

// Send text message
function sendTextMessage(message: string) {
  ws.send(JSON.stringify({
    type: 'message',
    content: message
  }));
}

// Send audio file
function sendAudioFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64Data = (e.target.result as string).split(',')[1];
    
    ws.send(JSON.stringify({
      type: 'audio',
      audioData: base64Data,
      mimeType: file.type || 'audio/webm'
    }));
  };
  reader.readAsDataURL(file);
}

// Record and send audio
async function recordAndSendAudio() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: Blob[] = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64Data = (e.target.result as string).split(',')[1];
      
      ws.send(JSON.stringify({
        type: 'audio',
        audioData: base64Data,
        mimeType: 'audio/webm'
      }));
    };
    
    reader.readAsDataURL(audioBlob);
    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  
  // Stop after 5 seconds
  setTimeout(() => {
    mediaRecorder.stop();
  }, 5000);
}

// Play audio response
function playAudioResponse(base64Audio: string) {
  const binaryString = atob(base64Audio);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const audioContext = new AudioContext();
  const numSamples = bytes.length / 2;
  const buffer = audioContext.createBuffer(1, numSamples, 24000);
  const channelData = buffer.getChannelData(0);
  
  // Convert 16-bit signed PCM to float32 (little-endian)
  const dataView = new DataView(bytes.buffer);
  for (let i = 0; i < numSamples; i++) {
    const int16 = dataView.getInt16(i * 2, true); // true = little-endian
    channelData[i] = int16 / 32768.0; // Normalize to -1.0 to 1.0
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

// End chat
function endChat() {
  ws.send(JSON.stringify({ type: 'end' }));
  ws.close();
}
```

### React Component Example

See `chat-react-example.tsx` for a complete React component (copy to frontend project).

## Features

✅ Real-time WebSocket communication
✅ JWT authentication
✅ Text message support
✅ Audio file upload support
✅ Multiple audio format support (MP3, WAV, WebM, OGG)
✅ Automatic conversation history tracking
✅ MongoDB storage for conversations
✅ Gemini 2.5 Flash integration

## Audio Processing Flow

### Input Audio (Speech-to-Text)
1. Client records or selects audio file
2. Audio converted to base64 encoding
3. Sent via WebSocket with mime type
4. Server saves audio file locally
5. Server uploads to Gemini Files API
6. **Gemini transcribes audio to text**
7. **Transcribed text is sent back to client**
8. **Transcribed text is passed to Gemini as a regular message**
9. AI generates text response
10. **AI generates audio response using persona voice settings**
11. Both text and audio response sent to client
12. Transcribed text and response saved to MongoDB

### Output Audio (Text-to-Speech)
- Every AI text response is automatically converted to audio
- Voice is determined by the persona's `voice` field from the scenario
- Audio format: PCM, 24kHz, 16-bit, mono
- Sent as base64-encoded data in the response message
- Client can decode and play the audio directly

## File Storage

Audio files are stored in: `uploads/audio/`
Format: `{userId}_{timestamp}.{extension}`

## MongoDB Schema

Conversations are stored with:
- User ID
- Scenario ID
- Rounds (multiple conversation sessions)
- Transcript (all messages with timestamps)
- Stats (emotion, fluency, wording scores)

## Testing

1. Open `chat-example.html` in a browser
2. Enter your JWT token and scenario ID
3. Click "Connect"
4. Send text messages or upload audio files
5. Receive AI responses in real-time

## Error Handling

All errors are returned as:
```json
{
  "type": "error",
  "content": "Error description"
}
```

Common errors:
- Authentication required (missing token)
- Invalid token
- Chat session not started
- Missing content/audioData
- File upload failures
- Gemini API errors
