-- Migration to add generalized parties and compliance insights
-- To support private party cases (MFA, Insurance, etc.)

-- 1. Update cases table for searchable parties
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS claimants text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS respondents text[] DEFAULT '{}';

-- 2. Update action_plans table for deep insights
ALTER TABLE action_plans
ADD COLUMN IF NOT EXISTS compliance_summary text,
ADD COLUMN IF NOT EXISTS risk_if_missed text,
ADD COLUMN IF NOT EXISTS nature_of_action jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS consideration_for_appeal text,
ADD COLUMN IF NOT EXISTS source_citations jsonb DEFAULT '{}';

-- 3. Add indexes for search performance
CREATE INDEX IF NOT EXISTS idx_cases_claimants ON cases USING GIN (claimants);
CREATE INDEX IF NOT EXISTS idx_cases_respondents ON cases USING GIN (respondents);
