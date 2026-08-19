import { useState } from 'react';
import ProfileScreen from './ProfileScreen.jsx';
import AdScreen from './AdScreen.jsx';

export default function App() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="app">
      <h1>Job Match</h1>
      <nav className="tabs">
        <button
          type="button"
          className={tab === 'profile' ? 'active' : ''}
          onClick={() => setTab('profile')}
        >
          Profile
        </button>
        <button
          type="button"
          className={tab === 'analyse' ? 'active' : ''}
          onClick={() => setTab('analyse')}
        >
          Analyse ad
        </button>
      </nav>
      {tab === 'profile' && <ProfileScreen />}
      {tab === 'analyse' && <AdScreen />}
    </div>
  );
}
