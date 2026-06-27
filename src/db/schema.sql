CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGINT PRIMARY KEY,
  username      TEXT NOT NULL,
  pontos_total  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jogos (
  id             SERIAL PRIMARY KEY,
  external_id    BIGINT,
  fase           TEXT NOT NULL CHECK (fase IN ('dezesseisavos', 'oitavas', 'quartas', 'semi', 'final', 'terceiro')),
  time_casa      TEXT NOT NULL,
  time_fora      TEXT NOT NULL,
  kickoff        TIMESTAMPTZ NOT NULL,
  placar_casa    INT,
  placar_fora    INT,
  classificado   TEXT,
  foi_penaltis   BOOLEAN NOT NULL DEFAULT FALSE,
  processado     BOOLEAN NOT NULL DEFAULT FALSE,
  multiplicador  INT NOT NULL CHECK (multiplicador IN (1, 2, 3, 4, 5))
);

ALTER TABLE jogos ADD COLUMN IF NOT EXISTS external_id BIGINT;

ALTER TABLE jogos DROP CONSTRAINT IF EXISTS jogos_fase_check;
ALTER TABLE jogos ADD CONSTRAINT jogos_fase_check
  CHECK (fase IN ('dezesseisavos', 'oitavas', 'quartas', 'semi', 'final', 'terceiro'));

ALTER TABLE jogos DROP CONSTRAINT IF EXISTS jogos_multiplicador_check;
ALTER TABLE jogos ADD CONSTRAINT jogos_multiplicador_check
  CHECK (multiplicador IN (1, 2, 3, 4, 5));

ALTER TABLE jogos ADD COLUMN IF NOT EXISTS aviso_deadline_postado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jogos ADD COLUMN IF NOT EXISTS resultado_postado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS jogos_kickoff_idx ON jogos (kickoff);
CREATE INDEX IF NOT EXISTS jogos_processado_idx ON jogos (processado) WHERE processado = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS jogos_external_id_uniq ON jogos (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS palpites (
  id           SERIAL PRIMARY KEY,
  usuario_id   BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  jogo_id      INT NOT NULL REFERENCES jogos(id) ON DELETE CASCADE,
  placar_casa  INT NOT NULL CHECK (placar_casa >= 0),
  placar_fora  INT NOT NULL CHECK (placar_fora >= 0),
  avanca       TEXT,
  pontos       INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, jogo_id)
);

CREATE INDEX IF NOT EXISTS palpites_jogo_idx ON palpites (jogo_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL,
  username    TEXT NOT NULL,
  acao        TEXT NOT NULL,
  jogo_id     INT,
  detalhes    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_acao_idx ON audit_log (acao);
