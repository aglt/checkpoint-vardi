PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workplace (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  archetype TEXT NOT NULL CHECK (archetype IN ('fixed', 'mobile', 'construction')),
  primary_language TEXT NOT NULL DEFAULT 'is'
);

CREATE INDEX IF NOT EXISTS workplace_owner_idx ON workplace (owner_id);

CREATE TABLE IF NOT EXISTS risk_assessment (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL REFERENCES workplace (id) ON DELETE CASCADE,
  checklist_id TEXT NOT NULL,
  checklist_slug TEXT NOT NULL,
  checklist_version TEXT NOT NULL,
  risk_matrix_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  started_at INTEGER NOT NULL,
  completed_at INTEGER
);

CREATE INDEX IF NOT EXISTS risk_assessment_owner_idx ON risk_assessment (owner_id);
CREATE INDEX IF NOT EXISTS risk_assessment_workplace_idx ON risk_assessment (workplace_id);

CREATE TABLE IF NOT EXISTS finding (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES risk_assessment (id) ON DELETE CASCADE,
  criterion_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unanswered' CHECK (status IN ('ok', 'notOk', 'notApplicable', 'unanswered')),
  notes TEXT,
  voice_transcript TEXT,
  notes_language TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS finding_owner_idx ON finding (owner_id);
CREATE INDEX IF NOT EXISTS finding_assessment_idx ON finding (assessment_id);
CREATE UNIQUE INDEX IF NOT EXISTS finding_assessment_criterion_unique
  ON finding (assessment_id, criterion_id);

CREATE TABLE IF NOT EXISTS risk_entry (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  finding_id TEXT NOT NULL REFERENCES finding (id) ON DELETE CASCADE,
  hazard TEXT,
  health_effects TEXT,
  who_at_risk TEXT,
  likelihood INTEGER,
  consequence INTEGER,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  -- Classification-only reasoning for the saved risk score. Mitigation or
  -- reviewer notes must use separate owned fields if they land later.
  classification_reasoning TEXT,
  current_controls TEXT,
  control_hierarchy TEXT CHECK (control_hierarchy IN ('eliminate', 'substitute', 'engineering', 'administrative', 'ppe')),
  cost_estimate INTEGER
);

CREATE INDEX IF NOT EXISTS risk_entry_owner_idx ON risk_entry (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS risk_entry_finding_unique ON risk_entry (finding_id);

CREATE TABLE IF NOT EXISTS risk_mitigation_action (
  id TEXT PRIMARY KEY NOT NULL,
  risk_entry_id TEXT NOT NULL REFERENCES risk_entry (id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  description TEXT NOT NULL,
  assignee_name TEXT,
  due_date INTEGER,
  status TEXT NOT NULL CHECK (status IN ('open', 'inProgress', 'done')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS risk_mitigation_action_owner_idx ON risk_mitigation_action (owner_id);
CREATE INDEX IF NOT EXISTS risk_mitigation_action_risk_entry_idx ON risk_mitigation_action (risk_entry_id);

CREATE TABLE IF NOT EXISTS summary (
  assessment_id TEXT PRIMARY KEY NOT NULL REFERENCES risk_assessment (id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  assessment_date INTEGER,
  participants TEXT,
  method TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS summary_owner_idx ON summary (owner_id);
