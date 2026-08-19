// C5 (SPEC.md Part 2): boilerplate must not be extracted as a requirement at all.
// §5 pitfalls: mixed Hebrew/English and RTL text; the same skill can appear twice in
// different wording ("Node", "Node.js") — decided (turn 1) to have the model merge
// those into one requirement, so no deduplication is needed in code.
export function buildExtractionPrompt(adText) {
  return `You are extracting structured requirements from a job ad. The ad text may mix Hebrew and English, and may include right-to-left text.

Return ONLY a single JSON object, with no other text before or after it, of exactly this shape:

{"requirements": [{"text": string, "source_quote": string, "type": "must_have" | "nice_to_have"}]}

Rules:
- Every "source_quote" must be copied VERBATIM from the ad text below — the exact same characters, in the exact same order, with no paraphrasing, translation, or correction. This is checked automatically; a quote that does not appear in the ad text will be discarded and will not be shown to the user.
- "text" is a short, human-readable statement of the requirement, in the same language the ad uses for it.
- "type" is exactly "must_have" or "nice_to_have" — never any other value, and never omitted.
- Extract only actual skill, qualification, or experience requirements. Do NOT extract company background, benefits, culture statements, or equal-opportunity text as requirements.
- If the same capability is mentioned more than once in different wording (for example "Node" and "Node.js"), extract it as a single requirement, using one representative mention from the ad text as the source_quote — do not return the same capability as multiple separate requirements.
- If the ad genuinely contains no extractable requirements, return {"requirements": []}.

AD TEXT:
"""
${adText}
"""`;
}
