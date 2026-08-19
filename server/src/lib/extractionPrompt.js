// C5 (SPEC.md Part 2): boilerplate must not be extracted as a requirement at all.
// §5 pitfalls: mixed Hebrew/English and RTL text; the same skill can appear twice in
// different wording ("Node", "Node.js") — decided (turn 1) to have the model merge
// those into one requirement, so no deduplication is needed in code.
// C13/C14/C15/Part 3 (turn 3): the model reads off any stated years threshold and
// whether a requirement asks for a degree, since that is reading the ad — the
// model's job under §3 — while comparing those readings against the profile stays
// ordinary code.
export function buildExtractionPrompt(adText) {
  return `You are extracting structured requirements from a job ad. The ad text may mix Hebrew and English, and may include right-to-left text.

Return ONLY a single JSON object, with no other text before or after it, of exactly this shape:

{"requirements": [{"text": string, "source_quote": string, "type": "must_have" | "nice_to_have", "years_required": number | null, "is_education_requirement": boolean}]}

Rules:
- Every "source_quote" must be copied VERBATIM from the ad text below — the exact same characters, in the exact same order, with no paraphrasing, translation, or correction. This is checked automatically; a quote that does not appear in the ad text will be discarded and will not be shown to the user.
- "text" is a short, human-readable statement of the requirement, in the same language the ad uses for it.
- "type" is exactly "must_have" or "nice_to_have" — never any other value, and never omitted.
- Extract only actual skill, qualification, or experience requirements. Do NOT extract company background, benefits, culture statements, or equal-opportunity text as requirements.
- If the same capability is mentioned more than once in different wording (for example "Node" and "Node.js"), extract it as a single requirement, using one representative mention from the ad text as the source_quote — do not return the same capability as multiple separate requirements.
- "years_required" is the minimum number of years of experience the requirement states, as a plain integer. Convert any phrasing to a number: "3+ years", "at least 3 years", "minimum 3 years" all become 3; a range like "3-5 years" becomes 3 (the lower bound); a number spelled out in words, in either language ("three years", "שלוש שנות ניסיון"), becomes 3. If the requirement states no number of years at all, "years_required" is null — do not guess a number that is not actually stated. A years threshold can apply to a role or seniority level ("4+ years of experience as a full-stack developer") exactly as it can to a single skill ("3+ years with Node.js") — extract it the same way either time.
- "is_education_requirement" is true only for a requirement asking for a degree or other formal education (a diploma, a specific field of study, a level like "Bachelor's" or "Master's"). It is false for every other requirement, including skill, tool, role, and experience requirements that happen to mention neither a degree nor a field of study.
- If the ad genuinely contains no extractable requirements, return {"requirements": []}.

AD TEXT:
"""
${adText}
"""`;
}
