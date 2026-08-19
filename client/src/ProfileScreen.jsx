import { useEffect, useState } from 'react';
import { getProfile, saveProfile } from './api.js';

// Years is kept as a string in local state (matching the text input's natural
// value) and only parsed to a number or null at save time — see parseYears.
function skillFromServer(skill) {
  return { name: skill.name, years: skill.years === null ? '' : String(skill.years) };
}

// Validated client-side before the request is sent, not left to the server:
// Number("abc") is NaN, and JSON.stringify(NaN) silently becomes null, which
// would turn an invalid years value into "not recorded" instead of an error.
function parseYears(raw) {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: true, years: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  return { ok: true, years: Number(trimmed) };
}

export default function ProfileScreen() {
  const [skills, setSkills] = useState([]);
  const [education, setEducation] = useState('');
  const [loadState, setLoadState] = useState('loading'); // loading | loaded | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    getProfile().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setSkills(result.profile.skills.map(skillFromServer));
        setEducation(result.profile.education ?? '');
        setLoadState('loaded');
      } else {
        setLoadState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSkillName(index, value) {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, name: value } : s)));
  }

  function updateSkillYears(index, value) {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, years: value } : s)));
  }

  function removeSkill(index) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function addSkill() {
    setSkills((prev) => [...prev, { name: '', years: '' }]);
  }

  async function handleSave() {
    const parsedSkills = [];
    for (const skill of skills) {
      const yearsResult = parseYears(skill.years);
      if (!yearsResult.ok) {
        setSaveState('error');
        setSaveMessage(
          `"${skill.name || '(unnamed skill)'}" has an invalid years value — enter a whole number, or leave it blank.`,
        );
        return;
      }
      parsedSkills.push({ name: skill.name, years: yearsResult.years });
    }

    setSaveState('saving');
    const result = await saveProfile({
      skills: parsedSkills,
      education: education.trim() === '' ? null : education,
    });

    if (result.ok) {
      setSkills(result.profile.skills.map(skillFromServer));
      setEducation(result.profile.education ?? '');
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
              className="skill-name"
              value={skill.name}
              onChange={(e) => updateSkillName(index, e.target.value)}
              placeholder="Skill name"
              dir="auto"
            />
            <input
              type="text"
              inputMode="numeric"
              className="skill-years"
              value={skill.years}
              onChange={(e) => updateSkillYears(index, e.target.value)}
              placeholder="years"
              aria-label={`Years of experience with ${skill.name || 'this skill'}`}
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

      <div className="education-row">
        <label htmlFor="education-input">Education</label>
        <input
          id="education-input"
          type="text"
          value={education}
          onChange={(e) => setEducation(e.target.value)}
          placeholder="e.g. BSc Computer Science"
          dir="auto"
        />
      </div>

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
