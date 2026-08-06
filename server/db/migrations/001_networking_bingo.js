export const id = '001_networking_bingo';

export const up = `
  CREATE TABLE IF NOT EXISTS bingo_games (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    join_code VARCHAR(24) NOT NULL UNIQUE,
    instructions TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
      CHECK (status IN ('draft', 'registration', 'live', 'paused', 'ended', 'archived')),
    prompt_count INTEGER NOT NULL DEFAULT 12 CHECK (prompt_count BETWEEN 3 AND 50),
    leaderboard_public BOOLEAN NOT NULL DEFAULT TRUE,
    contact_sharing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    next_finish_place INTEGER NOT NULL DEFAULT 1,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_games_event
    ON bingo_games(event_id);
  CREATE INDEX IF NOT EXISTS idx_bingo_games_status
    ON bingo_games(status);

  CREATE TABLE IF NOT EXISTS bingo_prompts (
    id SERIAL PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES bingo_games(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL CHECK (char_length(prompt_text) BETWEEN 3 AND 500),
    helper_text TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'conversation',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_prompts_game
    ON bingo_prompts(game_id, is_active, sort_order);

  CREATE TABLE IF NOT EXISTS bingo_participants (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS bingo_magic_links (
    id UUID PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES bingo_games(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    request_ip_hash CHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_magic_links_email
    ON bingo_magic_links(email, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bingo_magic_links_expiry
    ON bingo_magic_links(expires_at);

  CREATE TABLE IF NOT EXISTS bingo_sessions (
    id UUID PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES bingo_participants(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_sessions_participant
    ON bingo_sessions(participant_id);
  CREATE INDEX IF NOT EXISTS idx_bingo_sessions_expiry
    ON bingo_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS bingo_players (
    id UUID PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES bingo_games(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES bingo_participants(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    linkedin_url TEXT NOT NULL DEFAULT '',
    share_email BOOLEAN NOT NULL DEFAULT FALSE,
    share_linkedin BOOLEAN NOT NULL DEFAULT FALSE,
    connection_code VARCHAR(12) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'suspended', 'withdrawn')),
    completed_count INTEGER NOT NULL DEFAULT 0,
    finish_place INTEGER,
    completed_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (game_id, participant_id),
    UNIQUE (game_id, connection_code)
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_players_game
    ON bingo_players(game_id, status);
  CREATE INDEX IF NOT EXISTS idx_bingo_players_leaderboard
    ON bingo_players(game_id, finish_place, completed_count DESC);

  CREATE TABLE IF NOT EXISTS bingo_player_prompts (
    id UUID PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES bingo_players(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES bingo_prompts(id) ON DELETE RESTRICT,
    position INTEGER NOT NULL,
    completed_with_player_id UUID REFERENCES bingo_players(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    UNIQUE (player_id, position),
    UNIQUE (player_id, prompt_id)
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_player_prompts_player
    ON bingo_player_prompts(player_id, position);

  CREATE TABLE IF NOT EXISTS bingo_connections (
    id UUID PRIMARY KEY,
    game_id INTEGER NOT NULL REFERENCES bingo_games(id) ON DELETE CASCADE,
    scanner_player_id UUID NOT NULL REFERENCES bingo_players(id) ON DELETE CASCADE,
    target_player_id UUID NOT NULL REFERENCES bingo_players(id) ON DELETE CASCADE,
    player_prompt_id UUID NOT NULL REFERENCES bingo_player_prompts(id) ON DELETE CASCADE,
    prompt_id INTEGER NOT NULL REFERENCES bingo_prompts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (scanner_player_id <> target_player_id),
    UNIQUE (scanner_player_id, target_player_id),
    UNIQUE (player_prompt_id)
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_connections_game
    ON bingo_connections(game_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_bingo_connections_target
    ON bingo_connections(target_player_id);

  CREATE TABLE IF NOT EXISTS bingo_activity_log (
    id BIGSERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES bingo_games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES bingo_players(id) ON DELETE SET NULL,
    actor_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_bingo_activity_game
    ON bingo_activity_log(game_id, created_at DESC);
`;
