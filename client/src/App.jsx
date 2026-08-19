import { useState } from 'react';
import ProfileScreen from './ProfileScreen.jsx';
import AdScreen from './AdScreen.jsx';
import AdListScreen from './AdListScreen.jsx';
import AdDetailScreen from './AdDetailScreen.jsx';

export default function App() {
  const [tab, setTab] = useState('profile');
  const [selectedAdId, setSelectedAdId] = useState(null);

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
        <button
          type="button"
          className={tab === 'ads' ? 'active' : ''}
          onClick={() => setTab('ads')}
        >
          Ads
        </button>
      </nav>
      {tab === 'profile' && <ProfileScreen />}
      {tab === 'analyse' && <AdScreen />}
      {tab === 'ads' && !selectedAdId && <AdListScreen onSelect={setSelectedAdId} />}
      {tab === 'ads' && selectedAdId && (
        <AdDetailScreen analysisId={selectedAdId} onBack={() => setSelectedAdId(null)} />
      )}
    </div>
  );
}
