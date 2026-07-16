-- Run this script in your Supabase SQL Editor to fix the user deletion error.
-- This will update the foreign key constraints to properly handle user deletions.

-- 1. Profiles Table (1:1 with auth.users)
-- When a user is deleted from auth.users, their profile should be deleted automatically.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2. Leads Table (assigned_to)
-- When an agent is deleted, unassign their leads rather than deleting the leads.
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey,
  ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Leads Table (created_by)
-- When an agent is deleted, set the created_by field to null rather than deleting the leads.
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_created_by_fkey,
  ADD CONSTRAINT leads_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 4. Tasks Table
-- When a user is deleted, their tasks will be kept and set to unassigned (null).
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_user_id_fkey,
  ADD CONSTRAINT tasks_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
