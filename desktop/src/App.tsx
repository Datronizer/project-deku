import { DialogueBox } from './components/DialogueBox'
import { SettingsScreen } from './components/SettingsScreen'
import { useDialogue } from './hooks/useDialogue'
import { useSettings } from './hooks/useSettings'

function App() {
  const { payload, dismiss } = useDialogue()
  const { payload: settingsPayload, dismiss: dismissSettings, save } = useSettings()

  return (
    <div className="fixed inset-0 pointer-events-none">
      {payload && (
        <DialogueBox payload={payload} onClose={dismiss} />
      )}
      {settingsPayload && (
        <SettingsScreen
          debugState={settingsPayload.debugState}
          settings={settingsPayload.settings}
          onClose={dismissSettings}
          onSave={save}
        />
      )}
    </div>
  )
}

export default App
