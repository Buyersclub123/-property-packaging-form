-- EOI Sending System — Postgres Schema
-- Run via /api/admin/db-setup?secret=XXX

-- Template values: state × type → field values for the dynamic EOI template
CREATE TABLE IF NOT EXISTS eoi_template_values (
  id            SERIAL PRIMARY KEY,
  state         VARCHAR(3) NOT NULL,
  property_type VARCHAR(20) NOT NULL,
  field_name    VARCHAR(50) NOT NULL,
  field_value   TEXT NOT NULL,
  updated_by    VARCHAR(100),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(state, property_type, field_name)
);

-- Special conditions library (reusable wording)
CREATE TABLE IF NOT EXISTS special_conditions (
  id            SERIAL PRIMARY KEY,
  text          TEXT NOT NULL,
  state         VARCHAR(3),
  property_type VARCHAR(20),
  is_default    BOOLEAN DEFAULT FALSE,
  sort_order    INT DEFAULT 0,
  usage_count   INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Contact database (agents, brokers, solicitors)
CREATE TABLE IF NOT EXISTS contacts (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(20) NOT NULL,
  name          VARCHAR(200),
  company       VARCHAR(200),
  email         VARCHAR(200),
  phone         VARCHAR(50),
  address       TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);

-- EOI send history
CREATE TABLE IF NOT EXISTS eoi_sends (
  id                  SERIAL PRIMARY KEY,
  record_id           VARCHAR(50) NOT NULL,
  opportunity_id      VARCHAR(50),
  property_address    TEXT,
  send_type           VARCHAR(20) NOT NULL,
  offer_price         DECIMAL(12,2),
  agent_email         VARCHAR(200),
  agent_contact_id    INT REFERENCES contacts(id),
  sent_by             VARCHAR(100),
  sent_at             TIMESTAMPTZ DEFAULT NOW(),
  delivery_status     VARCHAR(20) DEFAULT 'pending',
  payload             JSONB,
  attachments         JSONB,
  eoi_status          VARCHAR(20) DEFAULT 'sent',
  previous_stage_id   VARCHAR(100),
  stage_move_ok       BOOLEAN,
  notes               TEXT
);
CREATE INDEX IF NOT EXISTS idx_eoi_sends_record ON eoi_sends(record_id);
CREATE INDEX IF NOT EXISTS idx_eoi_sends_opp ON eoi_sends(opportunity_id);

-- Audit log for template/condition changes
CREATE TABLE IF NOT EXISTS eoi_audit_log (
  id          SERIAL PRIMARY KEY,
  table_name  VARCHAR(50) NOT NULL,
  record_id   INT,
  field_name  VARCHAR(50),
  old_value   TEXT,
  new_value   TEXT,
  changed_by  VARCHAR(100),
  changed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Client portal entries (built later, schema ready now)
CREATE TABLE IF NOT EXISTS client_portal_entries (
  id              SERIAL PRIMARY KEY,
  opportunity_id  VARCHAR(50) NOT NULL,
  token           VARCHAR(100) NOT NULL UNIQUE,
  entity_name     VARCHAR(300),
  purchasers      JSONB,
  submitted_at    TIMESTAMPTZ,
  confirmed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_token ON client_portal_entries(token);
CREATE INDEX IF NOT EXISTS idx_portal_opp ON client_portal_entries(opportunity_id);
