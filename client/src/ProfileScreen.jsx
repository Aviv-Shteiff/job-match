import { useEffect, useState } from 'react';
import { getProfile, saveProfile } from './api.js';

export default function ProfileScreen() {
  const [skills, setSkills] = useState([]);
  const [loadState, setLoadState] = useState('loading'); // loading | loaded | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    getProfile().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSkills(result.profile.skills);
        setLoadState('loaded');
      } else {
        setLoadState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSkill(index, value) {
    setSkills((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function removeSkill(index) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function addSkill() {
    setSkills((prev) => [...prev, '']);
  }

  async function handleSave() {
    setSaveState('saving');
    const result = await saveProfile(skills);
    if (result.ok) {
      setSkills(result.profile.skills);
      setSaveState('saved');
      setSaveMessage('Profile saved.');
    } else {
      setSaveState('error');
      setSaveMessage(result.message || 'Could not save the profile.');
    }
  }

  if (loadState === 'loading') {
    return <p>Loading profile…</p>;
  }

  if (loadState === 'error') {
    return <p className="failure">Could not load your profile. Try reloading the page.</p>;
  }

  return (
    <section>
      <h2>Skills profile</h2>
      <ul className="skill-list">
        {skills.map((skill, index) => (
          // Index is a stable-enough key here: this is a flat, non-reorderable list
          // edited by the same user in one sitting, not a synced or animated list.
          <li key={index}>
            <input
              type="text"
              value={skill}
              onChange={(e) => updateSkill(index, e.target.value)}
              placeholder="Skill name"
            />
            <button type="button" onClick={() => removeSkill(index)} aria-label="Remove skill">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={addSkill}>
        + Add skill
      </button>
      <div className="save-row">
        <button type="button" onClick={handleSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {saveState === 'saved' && <span className="save-status success">{saveMessage}</span>}
        {saveState === 'error' && <span className="save-status failure">{saveMessage}</span>}
      </div>
    </section>
  );
}
