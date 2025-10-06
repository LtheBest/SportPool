-- Migration: Add feature toggles system for admin control
-- This allows admins to enable/disable features dynamically

CREATE TABLE IF NOT EXISTS feature_toggles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key VARCHAR(100) NOT NULL UNIQUE,
  feature_name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  category VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_feature_toggles_key ON feature_toggles(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_toggles_category ON feature_toggles(category);

-- Insert default feature toggles
INSERT INTO feature_toggles (feature_key, feature_name, description, category, is_enabled) 
VALUES 
  ('dark_mode', 'Mode Sombre', 'Permet aux utilisateurs de basculer entre le mode clair et sombre', 'ui', true),
  ('delete_events', 'Suppression d''événements', 'Permet aux utilisateurs de supprimer les événements qu''ils ont créés', 'events', true),
  ('user_profile_upload', 'Upload de photo de profil', 'Permet aux utilisateurs de télécharger une photo de profil', 'profile', true),
  ('event_messaging', 'Messagerie événementielle', 'Permet l''envoi de messages aux participants d''événements', 'communication', true),
  ('auto_invitations', 'Invitations automatiques', 'Envoi automatique d''emails aux participants lors de la création d''événements', 'communication', true),
  ('subscription_upgrade', 'Mise à niveau d''abonnement', 'Permet aux utilisateurs de mettre à niveau leur abonnement', 'subscription', true),
  ('event_export', 'Export d''événements', 'Permet l''export des données d''événements (PDF, CSV)', 'events', true),
  ('chatbot_support', 'Assistant virtuel', 'Active l''assistant virtuel pour le support client', 'support', true),
  ('analytics_tracking', 'Suivi analytique', 'Active le suivi des statistiques et analytics', 'analytics', true),
  ('email_notifications', 'Notifications email', 'Active l''envoi de notifications par email', 'communication', true)
ON CONFLICT (feature_key) DO NOTHING;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_toggles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_toggles_updated_at
  BEFORE UPDATE ON feature_toggles
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_toggles_updated_at();