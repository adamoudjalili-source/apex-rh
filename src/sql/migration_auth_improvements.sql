-- ============================================================
-- MIGRATION : Améliorations authentification
-- Session 13 — APEX RH
-- ============================================================

-- 1. Ajout colonne must_change_password sur la table users
-- Permet de forcer le changement de mot de passe à la première connexion
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT true;

-- 2. Les utilisateurs existants ont déjà changé leur mot de passe → false
UPDATE users SET must_change_password = false WHERE must_change_password IS NULL OR must_change_password = true;

-- 3. Mettre à jour le trigger handle_new_user pour inclure must_change_password = true
-- Les NOUVEAUX utilisateurs créés par l'admin devront changer leur mot de passe
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'collaborateur'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Politique RLS : un utilisateur peut mettre à jour son propre must_change_password
-- (nécessaire pour que le user puisse le passer à false après changement de mdp)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_update_own_password_flag'
  ) THEN
    CREATE POLICY users_update_own_password_flag ON users
      FOR UPDATE
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END;
$$;

-- ============================================================
-- FIN MIGRATION
-- À exécuter dans Supabase SQL Editor AVANT de déployer le code
-- ============================================================
