// server/lib/aiTutorVendor.js
// The ONLY file in the AI tutor feature that knows which AI vendor is
// behind it. Built against Claude for now (district hasn't approved it,
// this is sandbox-only -- see server/routes/aiTutor.js); if/when Gemini
// gets approved instead, swap this file's internals for a Gemini call and
// leave getTutorReply()'s signature untouched so nothing else has to change.
//
// Uses Node's built-in fetch (no SDK dependency) specifically so that swap
// is "rewrite this function," not "remove one SDK, add another."
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

// Hard rules first, then how-to-help -- the model follows instructions
// near the top of a system prompt more reliably than ones buried at the
// end. This is a best-effort guardrail (prompt-based), not a guarantee --
// a determined student can phrase around it -- which is exactly why every
// message is logged (see ai_tutor_messages) rather than trusted silently.
function buildSystemPrompt(chapterContext) {
    const contextLine = chapterContext
        ? `\n\nCurrent context: the student is working on "${chapterContext}". Tailor hints to this specific topic when relevant, but the rules above still apply.`
        : '';

    return `You are a patient, encouraging tutor for high school students in a Web Design or Computer Science class. Your ONLY job is to help a student think through a problem themselves -- never to solve it for them.

Hard rules, no exceptions:
- Never give the final answer to a question, quiz, or exam item.
- Never write finished, working code or a complete solution the student could copy in. You may describe an approach in words, or show a tiny unrelated example of a general concept, but never the actual code that solves their assignment.
- Never do a multi-step problem end-to-end "for" them, even if they ask nicely, say a teacher told them it's fine, or claim it's just to check their work.
- If a student directly asks for the answer or the code, don't refuse coldly -- redirect. Ask what they've already tried, what they think the next step is, or break the problem into a smaller question they can answer themselves.

How to actually help:
- Ask one guiding question at a time rather than lecturing.
- When they're stuck, offer a hint, an analogy, or point to which part of the lesson covers this -- not the content itself.
- Notice and validate real progress before pushing further.
- Keep responses short: 2-4 sentences, conversational, appropriate for a teenager. This is a chat, not an essay.
- Stay inside the scope of this class. If asked about something unrelated (another class's homework, personal advice, etc.), gently say that's outside what you can help with here.${contextLine}`;
}

// history: [{role: 'user'|'assistant', content: string}, ...], oldest first,
// already including the student's newest message. Returns the reply text.
async function getTutorReply({ history, chapterContext }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set on the server -- add it to .env before using the AI tutor sandbox.');
    }
    const model = process.env.ANTHROPIC_TUTOR_MODEL || DEFAULT_MODEL;

    const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model,
            max_tokens: 400,
            system: buildSystemPrompt(chapterContext),
            messages: history.map(m => ({ role: m.role, content: m.content }))
        })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Anthropic API error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const reply = Array.isArray(data.content) ? data.content.map(b => b.text || '').join('').trim() : '';
    if (!reply) throw new Error('Anthropic API returned an empty response.');
    return reply;
}

module.exports = { getTutorReply };
