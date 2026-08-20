import { useEffect, useState } from 'react';
import { getProfile, saveProfile } from './api.js';

// Years is kept as a string in local state (matching the text input's natural
// value) and only parsed to a number or null at save time — see parseYears.
function skillFromServer(skill) {
  return {
    name: skill.name,
    years: skill.years === null ? '' : String(skill.years),
    group: skill.group,
  };
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

// The profile is one flat list (server shape); the two sections are a view
// over it. Keeping {skill, index} pairs — rather than a filtered copy — means
// every row's update/remove/move handler still addresses the entry by its real
// position in the underlying array (C1: the grouping is display only).
function sectionEntries(skills, group) {
  return skills.map((skill, index) => ({ skill, index })).filter(({ skill }) => skill.group === group);
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

  function updateName(index, value) {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, name: value } : s)));
  }

  function updateYears(index, value) {
    setSkills((prev) => prev.map((s, i) => (i === index ? { ...s, years: value } : s)));
  }

  function toggleGroup(index) {
    setSkills((prev) =>
      prev.map((s, i) => (i === index ? { ...s, group: s.group === 'skill' ? 'role' : 'skill' } : s)),
    );
  }

  function removeEntry(index) {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  }

  function addEntry(group) {
    setSkills((prev) => [...prev, { name: '', years: '', group }]);
  }

  async function handleSave() {
    const parsedSkills = [];
    for (const skill of skills) {
      const yearsResult = parseYears(skill.years);
      if (!yearsResult.ok) {
        setSaveState('error');
        setSaveMessage(
          `"${skill.name || '(unnamed entry)'}" has an invalid years value — enter a whole number, or leave it blank.`,
        );
        return;
      }
      parsedSkills.push({ name: skill.name, years: yearsResult.years, group: skill.group });
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

  const skillEntries = sectionEntries(skills, 'skill');
  const roleEntries = sectionEntries(skills, 'role');

  return (
    <section>
      <h2>Skills profile</h2>

      <h3>Skills</h3>
      <ul className="skill-list">
        {skillEntries.map(({ skill, index }) => (
          // Index is a stable-enough key here: this is a flat, non-reorderable list
          // edited by the same user in one sitting, not a synced or animated list.
          <li key={index}>
            <input
              type="text"
              className="skill-name"
              value={skill.name}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder="Skill name"
              dir="auto"
            />
            <input
              type="text"
              inputMode="numeric"
              className="skill-years"
              value={skill.years}
              onChange={(e) => updateYears(index, e.target.value)}
              placeholder="years"
              aria-label={`Years of experience with ${skill.name || 'this skill'}`}
            />
            <button type="button" className="move-button" onClick={() => toggleGroup(index)}>
              → Role
            </button>
            <button type="button" onClick={() => removeEntry(index)} aria-label="Remove entry">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => addEntry('skill')}>
        + Add skill
      </button>

      <h3>Roles &amp; Experience</h3>
      <ul className="skill-list">
        {roleEntries.map(({ skill, index }) => (
          <li key={index}>
            <input
              type="text"
              className="skill-name"
              value={skill.name}
              onChange={(e) => updateName(index, e.target.value)}
              placeholder="Role, e.g. Backend Developer"
              dir="auto"
            />
            <input
              type="text"
              inputMode="numeric"
              className="skill-years"
              value={skill.years}
              onChange={(e) => updateYears(index, e.target.value)}
              placeholder="years"
              aria-label={`Years of experience as ${skill.name || 'this role'}`}
            />
            <button type="button" className="move-button" onClick={() => toggleGroup(index)}>
              → Skill
            </button>
            <button type="button" onClick={() => removeEntry(index)} aria-label="Remove entry">
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => addEntry('role')}>
        + Add role
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
