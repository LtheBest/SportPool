import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Initialiser Stripe avec votre clé publique
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj");

interface PaymentSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetPlan?: string; // Plan cible depuis l'inscription
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  type: 'payment' | 'subscription';
  interval?: 'monthly' | 'annual' | 'pack_single' | 'pack_10';
  features: string[];
  description: string;
  badge?: string;
  badgeColor?: string;
}

const subscriptionPlans: SubscriptionPlan[] = [
  // Offres événementielles (paiements uniques)
  {
    id: "evenementielle-single",
    name: "Pack Événement",
    price: 1500, // 15€
    type: "payment",
    interval: "pack_single", 
    description: "Idéal pour organiser un événement ponctuel",
    badge: "POPULAIRE",
    badgeColor: "bg-orange-100 text-orange-800",
    features: [
      "1 événement complet",
      "Profil de personnalisation",
      "Gestion conducteurs/passagers", 
      "Messagerie intégrée",
      "Suivi en temps réel",
      "Support prioritaire"
    ]
  },
  {
    id: "evenementielle-pack10",
    name: "Pack 10 Événements",
    price: 15000, // 150€
    type: "payment",
    interval: "pack_10",
    description: "Parfait pour les organisateurs réguliers",
    badge: "ÉCONOMIQUE",
    badgeColor: "bg-green-100 text-green-800",
    features: [
      "10 événements complets",
      "Profil de personnalisation",
      "Gestion conducteurs/passagers",
      "Messagerie intégrée", 
      "Suivi en temps réel",
      "Support prioritaire",
      "Valable 12 mois"
    ]
  },
  // Formules Pro (abonnements mensuels)
  {
    id: "pro-club",
    name: "Clubs & Associations", 
    price: 1999, // 19,99€
    type: "subscription",
    interval: "monthly",
    description: "Conçu pour les clubs sportifs et associations",
    badge: "PRO",
    badgeColor: "bg-blue-100 text-blue-800",
    features: [
      "Événements illimités",
      "Invitations illimitées",
      "Profil de personnalisation avancé",
      "Gestion multi-conducteurs",
      "Messagerie avancée",
      "Suivi en temps réel",
      "Statistiques détaillées",
      "Support prioritaire",
      "API d'intégration",
      "Branding personnalisé"
    ]
  },
  {
    id: "pro-pme",
    name: "PME",
    price: 4900, // 49€
    type: "subscription", 
    interval: "monthly",
    description: "Idéal pour les petites et moyennes entreprises",
    badge: "BUSINESS",
    badgeColor: "bg-purple-100 text-purple-800",
    features: [
      "Tout de Clubs & Associations",
      "Multi-utilisateurs (5 admins)",
      "Gestion des équipes", 
      "Reporting avancé",
      "Intégrations tierces",
      "Support téléphonique",
      "Formation personnalisée",
      "SLA garanti"
    ]
  },
  {
    id: "pro-entreprise",
    name: "Grandes Entreprises",
    price: 9900, // 99€
    type: "subscription",
    interval: "monthly", 
    description: "Solution entreprise complète et sur-mesure",
    badge: "ENTERPRISE", 
    badgeColor: "bg-yellow-100 text-yellow-800",
    features: [
      "Tout de PME",
      "Multi-utilisateurs illimités",
      "Gestion multi-sites",
      "API complète",
      "SSO/SAML",
      "Hébergement dédié (option)",
      "Support 24/7",
      "Account Manager dédié",
      "Personnalisation complète",
      "Conformité RGPD avancée"
    ]
  }
];

export default function PaymentSetup({ isOpen, onClose, onSuccess, targetPlan }: PaymentSetupProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>(targetPlan || "evenementielle-single");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Mettre à jour le plan sélectionné quand targetPlan change
  useEffect(() => {
    if (targetPlan) {
      setSelectedPlan(targetPlan);
    }
  }, [targetPlan]);

  const handleSubscribe = async () => {
    setIsLoading(true);
    
    try {
      console.log('🎯 Début du processus de paiement pour le plan:', selectedPlan);
      
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe n'a pas pu être initialisé. Vérifiez votre configuration Stripe.");
      }

      const plan = subscriptionPlans.find(p => p.id === selectedPlan);
      if (!plan) {
        throw new Error(`Plan non trouvé: ${selectedPlan}`);
      }

      console.log('📦 Plan sélectionné:', plan);

      // Créer la session de checkout
      console.log('📡 Appel API /api/subscriptions/create...');
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          successUrl: `${window.location.origin}/dashboard?payment_success=true`,
          cancelUrl: `${window.location.origin}/dashboard?payment_cancelled=true`,
        }),
      });

      console.log('📡 Réponse API status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur serveur (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('📡 Données reçues:', data);
      
      if (data.error || data.message) {
        throw new Error(data.error || data.message);
      }

      // Vérifier la présence des données nécessaires
      if (!data.url && !data.sessionId) {
        console.error('❌ Données manquantes dans la réponse:', data);
        throw new Error("Réponse serveur invalide: aucune URL de redirection fournie");
      }

      // Rediriger vers l'URL de checkout Stripe moderne
      if (data.url) {
        console.log('🚀 Redirection vers Stripe Checkout:', data.url);
        window.location.href = data.url;
      } else if (data.sessionId) {
        console.log('🚀 Redirection Stripe avec sessionId:', data.sessionId);
        // Fallback: utiliser l'ancienne méthode si l'URL n'est pas disponible
        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.sessionId,
        });
        if (stripeError) {
          console.error('❌ Erreur Stripe redirectToCheckout:', stripeError);
          throw new Error(stripeError.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur complète de paiement:', error);
      
      let errorMessage = "Une erreur est survenue lors de la configuration du paiement.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Messages d'erreur plus spécifiques
      if (error.message?.includes('fetch')) {
        errorMessage = "Impossible de contacter le serveur. Vérifiez votre connexion internet.";
      } else if (error.message?.includes('Stripe')) {
        errorMessage = `Erreur Stripe: ${error.message}`;
      }
      
      toast({
        title: "Erreur de paiement",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (priceInCents: number, interval?: string) => {
    const price = (priceInCents / 100).toFixed(2);
    
    if (interval === 'monthly') return `${price}€/mois`;
    if (interval === 'pack_single') return `${price}€`;
    if (interval === 'pack_10') return `${price}€`;
    
    return `${price}€`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 Activez votre abonnement
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Choisissez votre offre et commencez à profiter de toutes les fonctionnalités
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup
            value={selectedPlan}
            onValueChange={setSelectedPlan}
            className="grid lg:grid-cols-3 md:grid-cols-2 gap-6"
          >
            {subscriptionPlans.map((plan) => (
              <Label
                key={plan.id}
                htmlFor={plan.id}
                className={`relative cursor-pointer block transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'hover:shadow-lg'
                }`}
              >
                <RadioGroupItem
                  value={plan.id}
                  id={plan.id}
                  className="sr-only"
                />
                <Card className={`h-full border-2 transition-all duration-200 ${
                  selectedPlan === plan.id
                    ? 'border-primary shadow-lg bg-primary/5'
                    : 'border-border'
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {plan.badge && (
                        <Badge className={plan.badgeColor}>
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {formatPrice(plan.price, plan.interval)}
                      </div>
                      {plan.interval === 'pack_10' && (
                        <div className="text-sm text-muted-foreground">
                          Soit 15€ par événement
                        </div>
                      )}
                    </div>
                    <CardDescription className="text-sm">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {plan.features.slice(0, 5).map((feature, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <i className="fas fa-check text-green-500 mr-2 w-3"></i>
                          <span>{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 5 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          + {plan.features.length - 5} autres fonctionnalités
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Label>
            ))}
          </RadioGroup>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950 dark:border-blue-800">
            <div className="flex items-start space-x-3">
              <i className="fas fa-shield-alt text-blue-500 mt-1"></i>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Paiement 100% sécurisé</p>
                <ul className="space-y-1 text-xs">
                  <li>• Chiffrement SSL et protocoles de sécurité Stripe</li>
                  <li>• Aucune donnée de carte bancaire stockée sur nos serveurs</li>
                  <li>• Résiliation possible à tout moment depuis votre dashboard</li>
                  <li>• Remboursement sous 14 jours si vous n'êtes pas satisfait</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubscribe}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Configuration...
                </>
              ) : (
                <>
                  <i className="fas fa-credit-card mr-2"></i>
                  Procéder au paiement
                </>
              )}
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos conditions de service et notre politique de remboursement.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}