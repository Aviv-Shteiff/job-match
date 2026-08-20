// One-off script (turn 4, Q1): adds C1's display-only group field to every
// existing profile skill entry. Writes group: 'skill' to all of them, making no
// judgement about which entries are actually roles — that decision belongs to
// the user, made through the profile screen's move control (Q2) after this
// runs, not guessed at here. The profile is mutable by design (C1: editable),
// so this migrates in place rather than creating a new document.
//
// Run with: node --env-file=../.env scripts/migrateProfileGroups.js  (from server/)
//
// Idempotent: does nothing if every entry already has a group.
import { connectDb, closeDb } from '../src/db.js';

async function main() {
  const db = await connectDb();
  const profile = await db.collection('profiles').findOne({ _id: 'profile' });

  if (!profile) {
    console.log('No profile document exists yet. Nothing to migrate.');
    await closeDb();
    return;
  }

  const alreadyMigrated = profile.skills.every((skill) => skill.group !== undefined);
  if (alreadyMigrated) {
    console.log('Profile is already in the current shape. Nothing to do.');
    await closeDb();
    return;
  }

  const skills = profile.skills.map((skill) => ({ ...skill, group: skill.group ?? 'skill' }));
  await db.collection('profiles').updateOne({ _id: 'profile' }, { $set: { skills } });

  console.log(`Migrated ${skills.length} skill(s):`, JSON.stringify(skills));
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
