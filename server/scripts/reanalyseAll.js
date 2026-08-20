// One-off script (turn 3, decided per Q1/Q4): re-analyses every ad stored before
// this turn against the new extraction (years_required, is_education_requirement)
// and the now-filled-in profile. Creates a NEW analysis for each ad rather than
// overwriting — consistent with C9's immutable-snapshot rule and turn 2's G9
// decision not to silently discard evidence. Stale duplicates in the list are an
// accepted cost (LESSONS.md); the missing delete button stays a future-turn item.
//
// Run with: node --env-file=../.env scripts/reanalyseAll.js  (from server/)
//
// With no arguments, processes every analysis whose match has no profileUsed
// field (the turn-1/turn-2 shape). Original documents are never modified — a
// failure leaves the original exactly as it was, available to retry — so a
// second blanket run would re-process already-succeeded originals too. If any
// ad fails, pass its original _id(s) as arguments to retry only those:
//   node --env-file=../.env scripts/reanalyseAll.js <id1> <id2> ...
import { ObjectId } from 'mongodb';
import { connectDb, closeDb } from '../src/db.js';
import { analyseAd } from '../src/lib/analyse.js';

async function main() {
  const db = await connectDb();

  const idArgs = process.argv.slice(2);
  const toReanalyse = idArgs.length > 0
    ? await db
        .collection('analyses')
        .find({ _id: { $in: idArgs.map((id) => new ObjectId(id)) } })
        .sort({ analyzedAt: 1 })
        .toArray()
    : await db
        .collection('analyses')
        .find({ 'match.profileUsed': { $exists: false } })
        .sort({ analyzedAt: 1 })
        .toArray();

  console.log(`Re-analysing ${toReanalyse.length} ad(s)...`);

  const results = [];
  for (const [index, original] of toReanalyse.entries()) {
    const label = original.adText.slice(0, 50).replace(/\n/g, ' ');
    process.stdout.write(`  [${index + 1}/${toReanalyse.length}] ${label}... `);
    const result = await analyseAd(original.adText);
    if (result.ok) {
      console.log(
        `OK — must-have ${result.analysis.mustHavePercent}%, nice-to-have ${result.analysis.niceToHavePercent}%`,
      );
      results.push({ ok: true, originalId: String(original._id), newId: String(result.analysis._id) });
    } else {
      console.log(`FAILED — ${result.reason}: ${result.message}`);
      results.push({ ok: false, originalId: String(original._id), reason: result.reason, message: result.message });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\nDone: ${results.length - failed.length}/${results.length} succeeded.`);
  if (failed.length > 0) {
    console.log(`Retry with: node --env-file=../.env scripts/reanalyseAll.js ${failed.map((r) => r.originalId).join(' ')}`);
    for (const r of failed) {
      console.log(`  ${r.originalId}: ${r.reason} — ${r.message}`);
    }
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
