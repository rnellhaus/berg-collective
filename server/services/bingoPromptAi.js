/**
 * AI-assisted prompt generation for Networking Bingo.
 *
 * Generates candidate conversation prompts in BERG's voice. Nothing is written
 * to the database here — the admin reviews candidates and chooses which to keep,
 * so a bad generation can never reach participants.
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import Anthropic from '@anthropic-ai/sdk';

// The SDK resolves credentials itself, in order: ANTHROPIC_API_KEY, then
// ANTHROPIC_AUTH_TOKEN, then an `ant auth login` profile on disk. This mirrors
// that check so the admin UI only offers the feature when a call can actually
// succeed — a deployed function has an env var, a local dev machine may just
// have the CLI profile.
function hasCredentials() {
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return true;
  // Serverless has no profile on disk; don't stat the filesystem there.
  if (process.env.VERCEL) return false;
  const configDir = process.env.ANTHROPIC_CONFIG_DIR || join(homedir(), '.config', 'anthropic');
  const profile = process.env.ANTHROPIC_PROFILE || 'default';
  return existsSync(join(configDir, 'credentials', `${profile}.json`));
}

export const AI_PROMPTS_ENABLED = hasCredentials();

// Zero-arg construction so the SDK performs the resolution above rather than
// pinning to one source.
const client = AI_PROMPTS_ENABLED ? new Anthropic() : null;

// Real prompts used at past BERG events. These carry the voice far better than
// any description of it, so they are the core of the request: second person,
// one clear action, culturally specific to this community, warm rather than
// corporate.
const REFERENCE_PROMPTS = [
  'Spot someone rocking a Black-owned brand and ask them the story behind it.',
  'Ask around to see who has the wildest group chat name and compare yours!',
  'Meet someone who moved to New York within the last two years.',
  'Track down someone who speaks more than one language and find out which ones.',
  'See who in the room recently switched careers and ask what inspired the change.',
  'Introduce yourself to someone attending their very first BERG event.',
  "Find someone who's lived in another country and ask what they miss most about it.",
  'Find someone and share the best piece of advice you received this year.',
  'Look for someone who went to an HBCU.',
  'Discover who in the room runs their own business and what they do.',
  "Swap your favorite Black holiday movie picks with someone you haven't met yet.",
  "Locate someone who's part of a Black Greek organization.",
  'Find a fellow attendee who changed jobs or careers this year.',
  "See who follows @BergCollective and ask how long they've been tapped in.",
  'Meet someone whose career path is completely different from yours.',
];

const SYSTEM_PROMPT = `You write conversation prompts for BERG Collective's Networking Bingo — a game played at in-person events by the Black professional community BERG convenes.

Each prompt sends one attendee to talk to another attendee. A good prompt gives someone a reason to walk up to a stranger and an easy first question once they get there.

These are real prompts from past BERG events. Match their voice, length, and range:

${REFERENCE_PROMPTS.map((p) => `- ${p}`).join('\n')}

What makes them work:
- Second person, imperative. "Find someone who…", "Ask around…", "Swap…"
- One action per prompt. Never two instructions stitched together.
- Findable in a room of a few hundred people. "Someone who switched careers" works; "someone who has summited Kilimanjaro" does not.
- Culturally specific to this community — HBCUs, Black Greek life, Black-owned brands, the culture people actually share. This is what makes it feel like a BERG event rather than a generic icebreaker.
- Warm and casual. Contractions are good. An occasional exclamation mark is fine.
- A mix across the set: background and identity, career, culture and taste, and a few purely fun ones.

Avoid: corporate icebreaker language ("Network with a professional who…"), anything that could read as an interrogation about income, age, relationship status, or immigration status, prompts that single out one obvious person in the room, and prompts so broad that everyone qualifies.

Write prompts that stand on their own. The player sees only the prompt text.`;

const PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    prompts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          prompt_text: {
            type: 'string',
            description: 'The prompt shown to the player. One sentence, second person, under 200 characters.',
          },
          category: {
            type: 'string',
            enum: ['background', 'career', 'culture', 'fun'],
            description: 'Which kind of prompt this is, so the set can be balanced.',
          },
        },
        required: ['prompt_text', 'category'],
        additionalProperties: false,
      },
    },
  },
  required: ['prompts'],
  additionalProperties: false,
};

function buildUserMessage({ count, eventContext, existingPrompts }) {
  const parts = [`Write ${count} new Networking Bingo prompts.`];

  if (eventContext) {
    parts.push(`\nAbout this event:\n${eventContext}`);
  }

  if (existingPrompts?.length) {
    // Given the actual prompt set rather than a paraphrase, the model can
    // avoid near-duplicates instead of guessing at what already exists.
    parts.push(
      `\nThis game already has these prompts. Write prompts that are clearly different — don't restate these with new wording:\n${
        existingPrompts.map((p) => `- ${p}`).join('\n')
      }`
    );
  }

  parts.push('\nVary the categories across the set rather than clustering on one.');
  return parts.join('\n');
}

/**
 * Returns { prompts: [{ prompt_text, category }] }.
 * Throws an Error with a `status` for the route to surface.
 */
export async function generateBingoPrompts({ count = 12, eventContext = '', existingPrompts = [] } = {}) {
  if (!client) {
    const error = new Error('AI prompt generation is not configured on this server');
    error.status = 503;
    throw error;
  }

  const requested = Math.min(Math.max(Number(count) || 12, 1), 25);

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      // Measured ~9s at medium and ~8s at low, so effort is not the latency
      // lever here; medium is kept for the small quality edge. The first call
      // after a schema change (or after the 24h schema cache expires) costs
      // ~2min of one-time JSON-schema compilation — the admin UI says so.
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: PROMPT_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserMessage({
            count: requested,
            eventContext: String(eventContext || '').slice(0, 2000),
            existingPrompts: existingPrompts.slice(0, 60),
          }),
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      const error = new Error('The model declined this request. Try rephrasing the event context.');
      error.status = 422;
      throw error;
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      const error = new Error('The model returned no usable output. Please try again.');
      error.status = 502;
      throw error;
    }

    const parsed = JSON.parse(textBlock.text);
    const prompts = (parsed.prompts || [])
      .map((item) => ({
        prompt_text: String(item.prompt_text || '').trim(),
        category: ['background', 'career', 'culture', 'fun'].includes(item.category)
          ? item.category
          : 'conversation',
      }))
      // The database enforces 3-500 characters; filter here so a single bad
      // item cannot fail the admin's whole batch.
      .filter((item) => item.prompt_text.length >= 3 && item.prompt_text.length <= 500);

    if (!prompts.length) {
      const error = new Error('No usable prompts came back. Please try again.');
      error.status = 502;
      throw error;
    }

    return { prompts };
  } catch (error) {
    if (error.status) throw error;

    if (error instanceof Anthropic.RateLimitError) {
      const wrapped = new Error('Claude is rate limited right now. Try again in a moment.');
      wrapped.status = 429;
      throw wrapped;
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error('[Bingo AI] Anthropic authentication failed');
      const wrapped = new Error('AI prompt generation is not configured correctly.');
      wrapped.status = 503;
      throw wrapped;
    }
    if (error instanceof Anthropic.APIError) {
      console.error('[Bingo AI] Anthropic API error:', error.status, error.name);
      const wrapped = new Error('Could not reach the model right now. Please try again.');
      wrapped.status = 502;
      throw wrapped;
    }

    console.error('[Bingo AI] Prompt generation failed:', error.message);
    const wrapped = new Error('Could not generate prompts right now.');
    wrapped.status = 500;
    throw wrapped;
  }
}
