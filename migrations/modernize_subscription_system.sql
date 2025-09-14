-- Migration vers le nouveau système d'abonnement modernisé
-- Cette migration fait évoluer l'ancien système "découverte/premium" vers le nouveau système avec offres événementielles et formules Pro

-- Modifier la table organizations pour supporter les nouveaux types d'abonnement
ALTER TABLE organizations 
DROP CONSTRAINT IF EXISTS organizations_subscription_type_check,
ADD CONSTRAINT organizations_subscription_type_check 
CHECK (subscription_type IN ('decouverte', 'evenementielle', 'pro_club', 'pro_pme', 'pro_entreprise'));

ALTER TABLE organizations
DROP CONSTRAINT IF EXISTS organizations_payment_method_check,
ADD CONSTRAINT organizations_payment_method_check 
CHECK (payment_method IN ('monthly', 'annual', 'pack_single', 'pack_10'));

-- Ajouter les nouvelles colonnes pour les packs événementiels
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS package_remaining_events INTEGER,
ADD COLUMN IF NOT EXISTS package_expiry_date TIMESTAMP;

-- Modifier la table subscription_plans pour supporter les nouveaux types
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_type_check,
ADD CONSTRAINT subscription_plans_type_check 
CHECK (type IN ('decouverte', 'evenementielle', 'pro_club', 'pro_pme', 'pro_entreprise'));

ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_billing_interval_check,
ADD CONSTRAINT subscription_plans_billing_interval_check 
CHECK (billing_interval IN ('monthly', 'annual', 'pack_single', 'pack_10'));

-- Supprimer les anciens plans premium et les remplacer par les nouveaux
DELETE FROM subscription_plans WHERE type = 'premium';

-- Insérer les nouveaux plans d'abonnement
INSERT INTO subscription_plans (id, name, type, description, price, currency, billing_interval, max_events, max_invitations, features, is_active)
VALUES 
  -- Offre Découverte (inchangée)
  ('decouverte', 'Découverte', 'decouverte', 'Parfait pour découvrir TeamMove', 0, 'EUR', 'monthly', 1, 20, '["1 événement maximum", "Jusqu''à 20 invitations", "Gestion du covoiturage", "Support par email"]', true),
  
  -- Offres Événementielles
  ('evenementielle-single', 'Pack Événement', 'evenementielle', 'Idéal pour organiser un événement ponctuel', 1500, 'EUR', 'pack_single', 1, NULL, '["1 événement complet", "Profil de personnalisation", "Gestion conducteurs/passagers", "Messagerie intégrée", "Suivi en temps réel", "Support prioritaire"]', true),
  ('evenementielle-pack10', 'Pack 10 Événements', 'evenementielle', 'Parfait pour les organisateurs réguliers', 15000, 'EUR', 'pack_10', 10, NULL, '["10 événements complets", "Profil de personnalisation", "Gestion conducteurs/passagers", "Messagerie intégrée", "Suivi en temps réel", "Support prioritaire", "Valable 12 mois"]', true),
  
  -- Formules Pro
  ('pro-club', 'Clubs & Associations', 'pro_club', 'Conçu pour les clubs sportifs et associations', 1999, 'EUR', 'monthly', NULL, NULL, '["Événements illimités", "Invitations illimitées", "Profil de personnalisation avancé", "Gestion multi-conducteurs", "Messagerie avancée", "Suivi en temps réel", "Statistiques détaillées", "Support prioritaire", "API d''intégration", "Branding personnalisé"]', true),
  ('pro-pme', 'PME', 'pro_pme', 'Idéal pour les petites et moyennes entreprises', 4900, 'EUR', 'monthly', NULL, NULL, '["Tout de Clubs & Associations", "Multi-utilisateurs (5 admins)", "Gestion des équipes", "Reporting avancé", "Intégrations tierces", "Support téléphonique", "Formation personnalisée", "SLA garanti"]', true),
  ('pro-entreprise', 'Grandes Entreprises', 'pro_entreprise', 'Solution entreprise complète et sur-mesure', 9900, 'EUR', 'monthly', NULL, NULL, '["Tout de PME", "Multi-utilisateurs illimités", "Gestion multi-sites", "API complète", "SSO/SAML", "Hébergement dédié (option)", "Support 24/7", "Account Manager dédié", "Personnalisation complète", "Conformité RGPD avancée"]', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  currency = EXCLUDED.currency,
  billing_interval = EXCLUDED.billing_interval,
  max_events = EXCLUDED.max_events,
  max_invitations = EXCLUDED.max_invitations,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Migrer les organisations existantes avec l'ancien système premium vers le nouveau système
-- Les organisations premium deviennent pro_club (équivalent le plus proche)
UPDATE organizations 
SET 
  subscription_type = 'pro_club',
  updated_at = CURRENT_TIMESTAMP
WHERE subscription_type = 'premium' AND subscription_type IS NOT NULL;

-- Créer des indexes pour les nouvelles colonnes
CREATE INDEX IF NOT EXISTS idx_organizations_package_expiry ON organizations(package_expiry_date) WHERE package_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_package_remaining ON organizations(package_remaining_events) WHERE package_remaining_events IS NOT NULL;

-- Créer une table pour tracer les logs des rappels d'abonnement (pour éviter les doublons)
CREATE TABLE IF NOT EXISTS subscription_reminder_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL,
  reminder_type VARCHAR NOT NULL, -- 'expiry_warning', 'payment_failed', etc.
  days_before_expiry INTEGER,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Index pour les logs de rappels
CREATE INDEX IF NOT EXISTS idx_reminder_logs_org_type ON subscription_reminder_logs(organization_id, reminder_type);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_sent_at ON subscription_reminder_logs(sent_at);

-- Créer une table pour les statistiques mensuelles
CREATE TABLE IF NOT EXISTS monthly_statistics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  period VARCHAR NOT NULL, -- Format: YYYY-MM
  total_organizations INTEGER DEFAULT 0,
  active_subscriptions INTEGER DEFAULT 0,
  new_subscriptions INTEGER DEFAULT 0,
  subscription_types JSON DEFAULT '{}', -- Répartition par type
  total_revenue INTEGER DEFAULT 0, -- En centimes
  events_created INTEGER DEFAULT 0,
  invitations_sent INTEGER DEFAULT 0,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(period)
);

-- Index pour les statistiques
CREATE INDEX IF NOT EXISTS idx_monthly_stats_period ON monthly_statistics(period);

-- Ajouter des commentaires pour la documentation
COMMENT ON COLUMN organizations.subscription_type IS 'Type d''abonnement: decouverte (gratuit), evenementielle (packs payants), pro_club/pro_pme/pro_entreprise (abonnements mensuels)';
COMMENT ON COLUMN organizations.package_remaining_events IS 'Nombre d''événements restants dans le pack événementiel (NULL si pas de pack)';
COMMENT ON COLUMN organizations.package_expiry_date IS 'Date d''expiration du pack événementiel (NULL si pas de pack)';

COMMENT ON TABLE subscription_reminder_logs IS 'Logs des rappels d''abonnement envoyés pour éviter les doublons';
COMMENT ON TABLE monthly_statistics IS 'Statistiques mensuelles agrégées pour le reporting';

-- Message de fin
SELECT 'Migration vers le nouveau système d''abonnement terminée avec succès!' AS message;

COMMIT;