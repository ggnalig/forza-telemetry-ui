import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { SessionsView } from './components/SessionsView'
import { CarSettingsView } from './components/CarSettingsView'

type Section = 'home' | 'carSettings' | 'sessions'

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'carSettings', label: 'Car Settings', icon: '🔧' },
  { id: 'sessions', label: 'Sessions', icon: '📼' },
]

function App() {
  const [section, setSection] = useState<Section>('home')

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar - persistent across all 3 sections, matching the SimHub
          reference's layout shape (styled to this project's own dark/accent
          palette, not SimHub's purple). */}
      <nav className="w-44 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col py-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left ${
              section === item.id
                ? 'bg-blue-700 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 min-w-0">
        {section === 'home' && <Dashboard />}
        {section === 'carSettings' && <CarSettingsView />}
        {section === 'sessions' && <SessionsView />}
      </div>
    </div>
  )
}

export default App
