import { DialogueBox } from './components/DialogueBox'
import { SettingsScreen } from './components/SettingsScreen'
import { useDialogue } from './hooks/useDialogue'
import { useSettings } from './hooks/useSettings'

function App() {
  const { payload, dismiss } = useDialogue()
  const { payload: settingsPayload, dismiss: dismissSettings } = useSettings()

  return (
    <>
      {payload && <DialogueBox payload={payload} onClose={dismiss} />}
      {settingsPayload && (
        <SettingsScreen
          debugState={settingsPayload.debugState}
          onClose={dismissSettings}
        />
      )}
    </>
  )
}

export default App
