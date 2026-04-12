CREATE TABLE IF NOT EXISTS safety_plan (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  workplace_id TEXT NOT NULL REFERENCES workplace (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  review_due_at INTEGER,
  review_cadence TEXT NOT NULL DEFAULT 'yearly'
);

CREATE INDEX IF NOT EXISTS safety_plan_owner_idx ON safety_plan (owner_id);
CREATE INDEX IF NOT EXISTS safety_plan_workplace_idx ON safety_plan (workplace_id);
