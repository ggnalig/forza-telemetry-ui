import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { SessionsView } from './components/SessionsView'

type Mode = 'live' | 'sessions'

function App() {
  const [mode, setMode] = useState<Mode>('live')

  return (
    <div className="relative">
      <div className="fixed top-2 left-4 z-50 flex gap-1 bg-gray-950/80 border border-gray-800 rounded p-1">
        <button
          onClick={() => setMode('live')}
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
            mode === 'live' ? 'bg-blue-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setMode('sessions')}
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
            mode === 'sessions' ? 'bg-blue-700 text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Sesi
        </button>
      </div>
      {mode === 'live' ? <Dashboard /> : <SessionsView />}
    </div>
  )
}

export default App
