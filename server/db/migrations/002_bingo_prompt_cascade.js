export const id = '002_bingo_prompt_cascade';

export const up = `
  ALTER TABLE bingo_player_prompts
    DROP CONSTRAINT IF EXISTS bingo_player_prompts_prompt_id_fkey;

  ALTER TABLE bingo_player_prompts
    ADD CONSTRAINT bingo_player_prompts_prompt_id_fkey
    FOREIGN KEY (prompt_id)
    REFERENCES bingo_prompts(id)
    ON DELETE CASCADE;

  ALTER TABLE bingo_connections
    DROP CONSTRAINT IF EXISTS bingo_connections_prompt_id_fkey;

  ALTER TABLE bingo_connections
    ADD CONSTRAINT bingo_connections_prompt_id_fkey
    FOREIGN KEY (prompt_id)
    REFERENCES bingo_prompts(id)
    ON DELETE CASCADE;
`;
