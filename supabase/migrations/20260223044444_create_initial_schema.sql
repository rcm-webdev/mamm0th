/*
  # Initial Schema for Seller Copilot

  ## Overview
  Creates the foundational database structure for a seller productivity application
  that helps sellers manage priorities and tasks.

  ## New Tables
  
  ### `profiles`
  User profile information extending Supabase auth.users
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User's email address
  - `full_name` (text) - User's display name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### `priorities`
  Seller priorities and action items
  - `id` (uuid, primary key) - Unique priority identifier
  - `user_id` (uuid, foreign key) - References profiles.id
  - `title` (text) - Priority title/headline
  - `description` (text) - Detailed description
  - `category` (text) - Category (e.g., 'leads', 'followups', 'deals')
  - `status` (text) - Current status (e.g., 'pending', 'in_progress', 'completed')
  - `priority_level` (text) - Importance level (e.g., 'high', 'medium', 'low')
  - `due_date` (timestamptz) - Optional due date
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  
  ### Row Level Security (RLS)
  - Enabled on all tables
  - Users can only access their own data
  - Policies enforce authentication and ownership checks
  
  ### Policies Created
  1. profiles table:
     - Users can view their own profile
     - Users can update their own profile
     - Users can insert their own profile (on signup)
  
  2. priorities table:
     - Users can view their own priorities
     - Users can insert their own priorities
     - Users can update their own priorities
     - Users can delete their own priorities
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create priorities table
CREATE TABLE IF NOT EXISTS priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  priority_level text DEFAULT 'medium' NOT NULL,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS priorities_user_id_idx ON priorities(user_id);
CREATE INDEX IF NOT EXISTS priorities_status_idx ON priorities(status);
CREATE INDEX IF NOT EXISTS priorities_due_date_idx ON priorities(due_date);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE priorities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Priorities policies
CREATE POLICY "Users can view own priorities"
  ON priorities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own priorities"
  ON priorities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own priorities"
  ON priorities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own priorities"
  ON priorities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_priorities_updated_at
  BEFORE UPDATE ON priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
