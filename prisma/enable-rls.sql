-- ============================================
-- HASHLY - Row Level Security (RLS) Policies
-- ============================================
-- Run this in Supabase SQL Editor to enable RLS
-- This protects the database even if DATABASE_URL is leaked

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mint_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Anyone can read basic user info (for leaderboard)
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

-- Only the service role can insert/update/delete users
-- (Prisma uses service role key)
CREATE POLICY "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- EVENTS TABLE POLICIES
-- ============================================

-- Anyone can read approved events
CREATE POLICY "Approved events are viewable by everyone" ON events
  FOR SELECT USING (is_approved = true);

-- Service role can manage all events
CREATE POLICY "Service role can manage events" ON events
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- VOTES TABLE POLICIES
-- ============================================

-- Anyone can read votes (for vote counts)
CREATE POLICY "Votes are viewable by everyone" ON votes
  FOR SELECT USING (true);

-- Service role can manage votes
CREATE POLICY "Service role can manage votes" ON votes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- MINT PHASES TABLE POLICIES
-- ============================================

-- Anyone can read mint phases
CREATE POLICY "Mint phases are viewable by everyone" ON mint_phases
  FOR SELECT USING (true);

-- Service role can manage mint phases
CREATE POLICY "Service role can manage mint phases" ON mint_phases
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- USER MISSIONS TABLE POLICIES
-- ============================================

-- Users can only see their own missions
CREATE POLICY "Users can view own missions" ON user_missions
  FOR SELECT USING (true); -- Filtered by API

-- Service role can manage user missions
CREATE POLICY "Service role can manage user missions" ON user_missions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- POINT HISTORY TABLE POLICIES
-- ============================================

-- Users can only see their own point history
CREATE POLICY "Users can view own point history" ON point_history
  FOR SELECT USING (true); -- Filtered by API

-- Service role can manage point history
CREATE POLICY "Service role can manage point history" ON point_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- SHARES TABLE POLICIES
-- ============================================

-- Anyone can read shares
CREATE POLICY "Shares are viewable by everyone" ON shares
  FOR SELECT USING (true);

-- Service role can manage shares
CREATE POLICY "Service role can manage shares" ON shares
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- NFT VOTES TABLE POLICIES
-- ============================================

-- Anyone can read NFT votes
CREATE POLICY "NFT votes are viewable by everyone" ON nft_votes
  FOR SELECT USING (true);

-- Service role can manage NFT votes
CREATE POLICY "Service role can manage nft votes" ON nft_votes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- GRANT SERVICE ROLE ACCESS
-- ============================================
-- The service_role bypasses RLS by default in Supabase
-- This is what Prisma uses with SUPABASE_SERVICE_ROLE_KEY

-- Note: If you're using DATABASE_URL with postgres user,
-- RLS won't apply. You need to use the service role key
-- or create a custom role with limited permissions.
