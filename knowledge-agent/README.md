# LiveKit History Agent

A simple LiveKit-based voice agent that specializes in historical knowledge, using Gemini for LLM, Gladia for speech-to-text, and MiniMax for text-to-speech.

## Features

- **Real-time voice conversations** about history
- **Historical knowledge tools** for detailed information
- **Context-aware sessions** for React integration
- **Custom integrations** with Gemini, Gladia, and MiniMax

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements_livekit.txt
   ```

2. **Set environment variables in your `.env` file:**
   ```env
   GEMINI_API_KEY=your_gemini_key
   GLADIA_API_KEY=your_gladia_key
   MINIMAX_API_KEY=your_minimax_key
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your_livekit_key
   LIVEKIT_API_SECRET=your_livekit_secret
   ```

3. **Run the agent:**
   ```bash
   python livekit_agent.py start
   ```

## React Integration

To pass context from your React app, include it in the room metadata:

```javascript
const roomOptions = {
  metadata: JSON.stringify({
    context: "Discussing the history of Rome"
  })
};

await room.connect(LIVEKIT_URL, token, roomOptions);
```

The agent will use this context to provide more focused historical information.

## Tools Available

- `get_historical_info()` - Get detailed information about historical places/events
- `explore_time_period()` - Learn about specific historical eras

## Example Usage

1. Start the agent
2. Connect to the LiveKit room
3. Ask questions like:
   - "Tell me about the Roman Colosseum"
   - "What was life like in Medieval Europe?"
   - "Explore the Renaissance period"