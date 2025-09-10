-- Migration pour ajouter les fonctionnalités d'abonnement et nouvelles tables
-- À exécuter après avoir mis à jour le schéma

-- Modifier la table organizations pour ajouter les champs d'abonnement
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR DEFAULT 'decouverte' CHECK (subscription_type IN ('decouverte', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR CHECK (payment_method IN ('monthly', 'annual')),
ADD COLUMN IF NOT EXISTS event_created_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS invitations_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Créer la table subscription_plans si elle n'existe pas
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('decouverte', 'premium')),
  description TEXT,
  price INTEGER NOT NULL, -- Prix en centimes
  currency VARCHAR(3) DEFAULT 'EUR',
  billing_interval VARCHAR NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
  max_events INTEGER, -- null pour illimité
  max_invitations INTEGER, -- null pour illimité
  features JSON DEFAULT '[]',
  stripe_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Créer la table admin_conversations si elle n'existe pas
CREATE TABLE IF NOT EXISTS admin_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL,
  subject TEXT NOT NULL,
  status VARCHAR DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  priority VARCHAR DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Créer la table admin_messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS admin_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL,
  sender_id VARCHAR NOT NULL,
  sender_type VARCHAR NOT NULL CHECK (sender_type IN ('admin', 'organization')),
  message TEXT NOT NULL,
  message_type VARCHAR DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'attachment')),
  attachment_url TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES admin_conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES organizations(id)
);

-- Créer la table user_preferences si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_preferences (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL UNIQUE,
  theme VARCHAR DEFAULT 'auto' CHECK (theme IN ('light', 'dark', 'auto')),
  language VARCHAR(5) DEFAULT 'fr',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Insérer les plans d'abonnement par défaut si ils n'existent pas
INSERT INTO subscription_plans (name, type, description, price, billing_interval, max_events, max_invitations, features)
VALUES 
  ('Découverte', 'decouverte', 'Plan gratuit avec limitations : 1 événement et 20 invitations maximum', 0, 'monthly', 1, 20, '["1 événement", "20 invitations max", "Support communautaire"]'),
  ('Premium Mensuel', 'premium', 'Plan premium avec accès illimité - Facturation mensuelle', 2900, 'monthly', NULL, NULL, '["Événements illimités", "Invitations illimitées", "Support prioritaire", "Analytics avancées", "Thèmes personnalisés"]'),
  ('Premium Annuel', 'premium', 'Plan premium avec accès illimité - Facturation annuelle (2 mois gratuits)', 29000, 'annual', NULL, NULL, '["Événements illimités", "Invitations illimitées", "Support prioritaire", "Analytics avancées", "Thèmes personnalisés", "2 mois gratuits"]')
ON CONFLICT DO NOTHING;

-- Créer des indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_type ON organizations(subscription_type);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_organization_id ON admin_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_admin_conversations_status ON admin_conversations(status);
CREATE INDEX IF NOT EXISTS idx_admin_messages_conversation_id ON admin_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_sender_id ON admin_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_organization_id ON user_preferences(organization_id);

-- Mettre à jour les organisations existantes pour avoir les champs d'abonnement
UPDATE organizations 
SET 
  subscription_type = 'decouverte',
  subscription_status = 'active',
  event_created_count = 0,
  invitations_sent_count = 0,
  last_reset_date = CURRENT_TIMESTAMP
WHERE subscription_type IS NULL;

-- Créer des préférences par défaut pour toutes les organisations existantes
INSERT INTO user_preferences (organization_id, theme, language, email_notifications, push_notifications, marketing_emails)
SELECT id, 'auto', 'fr', true, true, false
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM user_preferences)
ON CONFLICT (organization_id) DO NOTHING;

COMMIT;