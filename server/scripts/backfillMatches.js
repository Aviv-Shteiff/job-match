// One-off script (turn-2 decision, Q3): the analyses stored before matching
// existed have no match snapshot. Backfills all of them against the current
// profile, using the same buildMatchSnapshot() the live analyse pipeline uses,
// so backfilled and freshly-analysed documents have identical shape.
//
// Run with: node --env-file=../.env scripts/backfillMatches.js  (from server/)
//
// Idempotent: only touches analyses that don't already have a `match` field, so
// running it again after new analyses have their own match is a no-op for those.
import { connectDb, closeDb } from '../src/db.js';
import { buildMatchSnapshot } from '../src/lib/matching.js';

async function main() {
  const db = await connectDb();
  const profile = await db.collection('profiles').findOne({ _id: 'profile' });
  const profileSkills = profile?.skills ?? [];

  const toBackfill = await db.collection('analyses').find({ match: { $exists: false } }).toArray();
  console.log(`Backfilling ${toBackfill.length} analysis(es) against profile: ${JSON.stringify(profileSkills)}`);

  for (const analysis of toBackfill) {
    const match = buildMatchSnapshot(analysis.requirements, profileSkills);
    await db.collection('analyses').updateOne(
      { _id: analysis._id },
      {
        $set: {
          mustHavePercent: match.mustHavePercent,
          niceToHavePercent: match.niceToHavePercent,
          match,
        },
      },
    );
    console.log(
      `  ${analysis._id}: mustHave ${match.mustHavePercent}%, niceToHave ${match.niceToHavePercent}% (${analysis.adText.slice(0, 40).replace(/\n/g, ' ')}...)`,
    );
  }

  console.log('Done.');
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
