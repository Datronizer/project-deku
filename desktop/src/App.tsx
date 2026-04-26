import { DialogueBox } from './components/DialogueBox'
import { DebugScreen } from './components/DebugScreen'
import { useDialogue } from './hooks/useDialogue'
import { useDebug } from './hooks/useDebug'

function App() {
  const { payload, dismiss } = useDialogue()
  const { state: debugState, dismiss: dismissDebug } = useDebug()

  return (
    <div className="fixed inset-0 pointer-events-none">
      {payload && (
        <DialogueBox payload={payload} onClose={dismiss} />
      )}
      {debugState && (
        <DebugScreen state={debugState} onClose={dismissDebug} />
      )}
    </div>
  )
}

export default App
