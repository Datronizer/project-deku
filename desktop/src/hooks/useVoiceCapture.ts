import { useState, useRef, useCallback } from 'react'

export interface VoiceCaptureState {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  error: string | null
}

export function useVoiceCapture() {
  const [state, setState] = useState<VoiceCaptureState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    error: null,
  })

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const startListening = useCallback(async () => {
    try {
      // Request microphone permission
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Use Web Speech API if available
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      if (!SpeechRecognition) {
        setState(prev => ({ ...prev, error: 'Speech Recognition not supported' }))
        return
      }

      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onstart = () => {
        setState(prev => ({ ...prev, isListening: true, error: null, transcript: '' }))
      }

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            setState(prev => ({ ...prev, transcript }))
          } else {
            interimTranscript += transcript
          }
        }
        if (interimTranscript) {
          setState(prev => ({ ...prev, transcript: interimTranscript }))
        }
      }

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        setState(prev => ({ ...prev, error: event.error, isListening: false }))
      }

      recognitionRef.current.onend = () => {
        setState(prev => ({ ...prev, isListening: false }))
      }

      recognitionRef.current.start()
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Microphone access denied',
      }))
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
    }
    setState(prev => ({ ...prev, isListening: false }))
  }, [])

  const resetTranscript = useCallback(() => {
    setState(prev => ({ ...prev, transcript: '', error: null }))
  }, [])

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  }
}
