// One-off script (turn 3): converts the profile document from turn 1/2's plain
// skill-name-string shape into C1's {name, years} entries, and adds the
// education field. The profile is mutable by design (C1: editable), so this
// migrates in place rather than creating a new document the way analyses do.
//
// Run with: node --env-file=../.env scripts/migrateProfile.js  (from server/)
//
// Idempotent: does nothing if the profile is already in the new shape or
// doesn't exist yet.
import { connectDb, closeDb } from '../src/db.js';

async function main() {
  const db = await connectDb();
  const profile = await db.collection('profiles').findOne({ _id: 'profile' });

  if (!profile) {
    console.log('No profile document exists yet. Nothing to migrate.');
    await closeDb();
    return;
  }

  const alreadyMigrated =
    profile.skills.length === 0 || typeof profile.skills[0] === 'object';

  if (alreadyMigrated) {
    console.log('Profile is already in the current shape. Nothing to do.');
    await closeDb();
    return;
  }

  const skills = profile.skills.map((name) => ({ name, years: null }));
  await db
    .collection('profiles')
    .updateOne({ _id: 'profile' }, { $set: { skills, education: null } });

  console.log(`Migrated ${skills.length} skill(s):`, JSON.stringify(skills));
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
