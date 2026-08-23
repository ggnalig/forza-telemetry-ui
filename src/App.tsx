import { useState } from 'react'
import { Dashboard } from './components/Dashboard'
import { SessionsView } from './components/SessionsView'
import { CarSettingsView } from './components/CarSettingsView'
import { MobileTachometer } from './components/MobileTachometer'

type Section = 'home' | 'carSettings' | 'sessions'

const NAV_ITEMS: { id: Section; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'carSettings', label: 'Car Settings', icon: '🔧' },
  { id: 'sessions', label: 'Sessions', icon: '📼' },
]

function App() {
  const [section, setSection] = useState<Section>('home')

  // A standalone, chrome-free tachometer page for a phone mount - reachable
  // directly at /mobile (bookmarkable, no sidebar flash first). Plain
  // pathname check, not a router: this is the only route besides the
  // sidebar's 3 sections, so a full router dependency isn't warranted
  // (matches this codebase's existing zero-router convention). Requires the
  // dev/production server to fall back to index.html for unknown paths -
  // Vite's dev server already does this by default.
  if (window.location.pathname === '/mobile') {
    return <MobileTachometer />
  }

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
