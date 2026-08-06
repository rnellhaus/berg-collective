export const id = '003_bingo_instagram_sharing';

// Additive and idempotent: safe to apply to populated production tables.
// Sharing defaults to FALSE so consent is never inferred from a stored URL.
export const up = `
  ALTER TABLE bingo_participants
    ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT '';

  ALTER TABLE bingo_players
    ADD COLUMN IF NOT EXISTS instagram_url TEXT NOT NULL DEFAULT '';

  ALTER TABLE bingo_players
    ADD COLUMN IF NOT EXISTS share_instagram BOOLEAN NOT NULL DEFAULT FALSE;
`;
