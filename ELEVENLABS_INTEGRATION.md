# ElevenLabs Agent Widget Integration

This project now includes an ElevenLabs ConvAI widget that allows users to talk to an AI agent with voice synthesis directly from the website.

## Features

- **Voice Input**: Users can speak to the agent using their microphone
- **Voice Output**: Agent responds with synthesized speech via ElevenLabs
- **Text Chat**: Users can also type messages if they prefer
- **Real-time Interaction**: Seamless conversation experience

##  How It Works

The integration uses the ElevenLabs ConvAI widget embed, which provides:
- Speech-to-text for user voice input
- AI conversation via Gemini/your backend
- Text-to-speech synthesis for agent responses

## Configuration

### To Update the Agent ID

1. Open [frontend/src/App.tsx](frontend/src/App.tsx)
2. Find the `ElevenLabsAgent` component:
   ```tsx
   <ElevenLabsAgent 
   <!-- katsuki agent, but can change for another lol -->
     agentId="agent_9201kq1ncxtqf3papmrfkdgmhpge" 
     title="Talk to Project Bakugou Agent"
   />
   ```
3. Use `agent_9201kq1ncxtqf3papmrfkdgmhpge` for katsuki. Can add more in the futurue 

Or open [frontend/src/components/ElevenLabsAgent.tsx](frontend/src/components/ElevenLabsAgent.tsx) and update the default `agentId` prop.

### To Create/Get an Agent ID

1. Go to [ElevenLabs Console](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent or use an existing one
3. Copy the agent ID from the URL or agent settings
4. Paste it into the component configuration above

## 📦 File Structure

```
frontend/src/
├── components/
│   ├── ElevenLabsAgent.tsx      # Main component
│   └── ElevenLabsAgent.css      # Styling
├── App.tsx                      # Updated with widget
└── App.css                      # Updated with section styling
```

## 🚀 Running the Project

```bash
# Install dependencies
./bootstrap.sh

# Start dev servers (frontend + backend)
./dev.sh

# Or use VS Code Run & Debug: "Dev: Frontend + Backend"
```

The agent widget will appear at the bottom of your website!

## Customization

You can customize the agent component by passing props:

```tsx
<ElevenLabsAgent 
  agentId="your_agent_id_here"           // The ElevenLabs agent ID
  title="Custom Title"                   // Custom heading text
/>
```

## Resources

- [ElevenLabs ConvAI Docs](https://elevenlabs.io/docs/conversational-ai)
- [ElevenLabs Console](https://elevenlabs.io/app)
- [Agent Widget Embed Reference](https://www.npmjs.com/package/@elevenlabs/convai-widget-embed)

## Troubleshooting

**Widget not appearing?**
- Check browser console for errors (F12 → Console)
- Verify agent ID is correct
- Ensure JavaScript is enabled

**Audio not working?**
- Check browser microphone permissions
- Verify speaker is connected
- Test microphone access on your machine

**Agent not responding?**
- Verify agent is active in ElevenLabs console
- Check network tab for API errors
- Ensure agent configuration is correct

---

Should work after this. If not, kmss
