/*
  # Complete Seller Copilot Schema

  ## Overview
  This migration transforms the basic priority app into a full AI-powered seller copilot
  with Square integration, transaction analytics, vector embeddings, and adaptive learning.

  ## New Tables

  ### `seller_profile`
  Extended seller business information
  - `id` (uuid, primary key) - References auth.users
  - `business_name` (text) - Business name
  - `business_type` (text) - Type of business
  - `quarterly_revenue_goal` (numeric) - Revenue target
  - `risk_tolerance` (text) - low, medium, high
  - `created_at`, `updated_at` (timestamptz)

  ### `customer`
  Customer records synced from Square
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Seller who owns this customer
  - `square_customer_id` (text, unique) - Square's customer ID
  - `name` (text) - Customer name
  - `email` (text) - Customer email
  - `raw_data` (jsonb) - Full Square customer object

  ### `transaction`
  Transaction records synced from Square payments
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Seller
  - `customer_id` (uuid) - FK to customer
  - `square_payment_id` (text, unique) - Square's payment ID
  - `date` (timestamptz) - Transaction timestamp
  - `amount` (numeric) - Transaction amount in dollars
  - `item_details` (jsonb) - Line items
  - `raw_data` (jsonb) - Full Square payment object

  ### `priorities` (modified)
  AI-generated priority cards - exactly 3 active per user per week
  - Adds: `generation_id`, `rank`, `rationale`, `recommended_action`, `expected_impact`
  - Adds: `pattern_type`, `supporting_data`, `impact_score`, `override_priority`
  - Adds: `acted_on_at`, `dismissed_at`, `viewed_at`, `expires_at`
  - Removes: `description`, `category`, `priority_level`, `due_date`, `completed_at`

  ### `priority_outcomes`
  Impact measurement for acted-on priorities
  - `id` (uuid, primary key)
  - `priority_id` (uuid) - FK to priorities
  - `user_id` (uuid)
  - `measurement_window_days` (integer) - Default 7
  - `metric_before` (jsonb) - Pre-action metrics snapshot
  - `metric_after` (jsonb) - Post-action metrics (7 days later)
  - `delta_revenue` (numeric) - Revenue change
  - `uplift_confirmed` (boolean) - True if positive impact

  ### `seller_memory`
  Persistent AI memory about the seller - decisions, patterns, outcomes
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `memory_type` (text) - decision, pattern, goal, outcome
  - `content` (text) - Memory text
  - `metadata` (jsonb)
  - `embedding` (vector(1536)) - OpenAI embedding for RAG

  ### `embeddings`
  Vector store for transaction chunks and memory chunks
  - `id` (uuid, primary key)
  - `user_id` (uuid)
  - `source_type` (text) - transaction_chunk, memory_chunk
  - `source_id` (text) - Week string or memory ID
  - `content` (text) - Embedded text
  - `embedding` (vector(1536))
  - `metadata` (jsonb)

  ### `chat_message`
  Chat conversation history
  - `id` (uuid, primary key)
  - `chat_id` (uuid) - Session identifier
  - `user_id` (uuid)
  - `role` (text) - user or assistant
  - `content` (text)
  - `created_at` (timestamptz)

  ### `square_connections`
  Per-user Square OAuth (future - dev uses env token)
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique)
  - `access_token` (text)
  - `merchant_id` (text)
  - `connected_at` (timestamptz)

  ## Extensions
  - pgvector for embeddings

  ## Functions
  - `match_embeddings` - Vector similarity search for RAG
  - `get_priorities_due_for_measurement` - Find priorities ready for impact tracking

  ## Security
  All tables have RLS enabled with authenticated user policies
*/

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create seller_profile table
CREATE TABLE IF NOT EXISTS seller_profile (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text,
  business_type text,
  quarterly_revenue_goal numeric(12,2),
  risk_tolerance text DEFAULT 'medium',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create customer table
CREATE TABLE IF NOT EXISTS customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  square_customer_id text UNIQUE,
  name text,
  email text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create transaction table
CREATE TABLE IF NOT EXISTS transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customer(id) ON DELETE SET NULL,
  square_payment_id text UNIQUE,
  date timestamptz NOT NULL,
  amount numeric(12,2) NOT NULL,
  item_details jsonb,
  raw_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Drop old priorities table and recreate with new schema
DROP TABLE IF EXISTS priorities CASCADE;

CREATE TABLE priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id uuid NOT NULL,
  rank smallint NOT NULL CHECK (rank IN (1, 2, 3)),
  title text NOT NULL,
  rationale text NOT NULL,
  recommended_action text NOT NULL,
  expected_impact text NOT NULL,
  pattern_type text NOT NULL,
  supporting_data jsonb,
  impact_score numeric(6,2),
  status text NOT NULL DEFAULT 'active',
  override_priority boolean NOT NULL DEFAULT false,
  acted_on_at timestamptz,
  dismissed_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Create priority_outcomes table
CREATE TABLE IF NOT EXISTS priority_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id uuid NOT NULL REFERENCES priorities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measurement_window_days integer NOT NULL DEFAULT 7,
  metric_before jsonb NOT NULL,
  metric_after jsonb,
  delta_revenue numeric(12,2),
  uplift_confirmed boolean,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create seller_memory table
CREATE TABLE IF NOT EXISTS seller_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id text,
  content text NOT NULL,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create chat_message table
CREATE TABLE IF NOT EXISTS chat_message (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create square_connections table
CREATE TABLE IF NOT EXISTS square_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  merchant_id text,
  connected_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS customer_user_id_idx ON customer(user_id);
CREATE INDEX IF NOT EXISTS customer_square_id_idx ON customer(square_customer_id);
CREATE INDEX IF NOT EXISTS transaction_user_id_idx ON transaction(user_id);
CREATE INDEX IF NOT EXISTS transaction_customer_id_idx ON transaction(customer_id);
CREATE INDEX IF NOT EXISTS transaction_date_idx ON transaction(date);
CREATE INDEX IF NOT EXISTS transaction_square_id_idx ON transaction(square_payment_id);
CREATE INDEX IF NOT EXISTS priorities_user_id_idx ON priorities(user_id);
CREATE INDEX IF NOT EXISTS priorities_status_idx ON priorities(status);
CREATE INDEX IF NOT EXISTS priorities_generation_id_idx ON priorities(generation_id);
CREATE INDEX IF NOT EXISTS priority_outcomes_priority_id_idx ON priority_outcomes(priority_id);
CREATE INDEX IF NOT EXISTS priority_outcomes_user_id_idx ON priority_outcomes(user_id);
CREATE INDEX IF NOT EXISTS seller_memory_user_id_idx ON seller_memory(user_id);
CREATE INDEX IF NOT EXISTS embeddings_user_id_idx ON embeddings(user_id);
CREATE INDEX IF NOT EXISTS chat_message_chat_id_idx ON chat_message(chat_id);
CREATE INDEX IF NOT EXISTS chat_message_user_id_idx ON chat_message(user_id);

-- Enable RLS on all tables
ALTER TABLE seller_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE square_connections ENABLE ROW LEVEL SECURITY;

-- seller_profile policies
CREATE POLICY "Users can view own seller profile"
  ON seller_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own seller profile"
  ON seller_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own seller profile"
  ON seller_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- customer policies
CREATE POLICY "Users can view own customers"
  ON customer FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customers"
  ON customer FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customers"
  ON customer FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customers"
  ON customer FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- transaction policies
CREATE POLICY "Users can view own transactions"
  ON transaction FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transaction FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transaction FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transaction FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- priorities policies
CREATE POLICY "Users can view own priorities"
  ON priorities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own priorities"
  ON priorities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own priorities"
  ON priorities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own priorities"
  ON priorities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- priority_outcomes policies
CREATE POLICY "Users can view own priority outcomes"
  ON priority_outcomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own priority outcomes"
  ON priority_outcomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own priority outcomes"
  ON priority_outcomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- seller_memory policies
CREATE POLICY "Users can view own seller memory"
  ON seller_memory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seller memory"
  ON seller_memory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seller memory"
  ON seller_memory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own seller memory"
  ON seller_memory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- embeddings policies
CREATE POLICY "Users can view own embeddings"
  ON embeddings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings"
  ON embeddings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings"
  ON embeddings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- chat_message policies
CREATE POLICY "Users can view own chat messages"
  ON chat_message FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON chat_message FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- square_connections policies
CREATE POLICY "Users can view own square connection"
  ON square_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own square connection"
  ON square_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own square connection"
  ON square_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_seller_profile_updated_at
  BEFORE UPDATE ON seller_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_updated_at
  BEFORE UPDATE ON customer
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seller_memory_updated_at
  BEFORE UPDATE ON seller_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_user_id uuid,
  match_threshold float,
  match_count int
)
RETURNS TABLE (id uuid, content text, metadata jsonb, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT id, content, metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE user_id = match_user_id
    AND source_type = 'transaction_chunk'
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Find priorities ready for impact measurement
CREATE OR REPLACE FUNCTION get_priorities_due_for_measurement()
RETURNS TABLE (
  outcome_id uuid,
  priority_id uuid,
  user_id uuid,
  pattern_type text,
  title text,
  supporting_data jsonb,
  metric_before jsonb,
  acted_on_at timestamptz
)
LANGUAGE sql STABLE AS $$
  SELECT
    po.id,
    po.priority_id,
    p.user_id,
    p.pattern_type,
    p.title,
    p.supporting_data,
    po.metric_before,
    p.acted_on_at
  FROM priority_outcomes po
  JOIN priorities p ON p.id = po.priority_id
  WHERE po.measured_at IS NULL
    AND p.acted_on_at IS NOT NULL
    AND p.acted_on_at <= now() - interval '7 days';
$$;
