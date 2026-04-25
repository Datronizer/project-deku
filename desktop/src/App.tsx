import { DialogueBox } from './components/DialogueBox'
import { useDialogue } from './hooks/useDialogue'

function App() {
  const { payload, dismiss } = useDialogue()

  return (
    <div className="fixed inset-0 pointer-events-none">
      {payload && (
        <DialogueBox payload={payload} onClose={dismiss} />
      )}
    </div>
  )
}

export default App
