import { useEffect } from 'react'

interface ElevenLabsAgentProps {
  agentId?: string
  title?: string
}

/**
 * ElevenLabs ConvAI Widget Component
 * Embeds the ElevenLabs agent widget into your React app
 * 
 * Usage:
 * <ElevenLabsAgent 
 *   agentId="your_agent_id_here"
 *   title="Talk to Agent"
 * />
 */
export function ElevenLabsAgent({ 
  agentId = 'agent_9201kq1ncxtqf3papmrfkdgmhpge',
  title = 'Agent Widget'
}: ElevenLabsAgentProps) {
  useEffect(() => {
    // Load the ElevenLabs ConvAI widget script
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed'
    script.async = true
    script.type = 'text/javascript'
    document.head.appendChild(script)

    return () => {
      // Cleanup: remove script when component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="elevenlabs-agent-wrapper">
      <div className="agent-container">
        <h2>{title}</h2>
        <p>Click the widget below to start talking with the agent 🎤</p>
        {/* ElevenLabs ConvAI Widget - Replace agent-id with your own */}
        <elevenlabs-convai 
          agent-id={agentId}
        ></elevenlabs-convai>
      </div>
    </div>
  )
}
