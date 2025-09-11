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
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'annual';
  features: string[];
  stripePriceId?: string;
  savings?: string;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "premium-monthly",
    name: "Premium Mensuel",
    price: 1299, // 12,99€ en centimes
    interval: "monthly",
    stripePriceId: "price_premium_monthly", // À remplacer par le vrai ID Stripe
    features: [
      "Événements illimités",
      "Invitations illimitées",
      "Statistiques avancées",
      "Support prioritaire",
      "Messagerie avancée",
      "Export de données"
    ]
  },
  {
    id: "premium-annual", 
    name: "Premium Annuel",
    price: 9999, // 99,99€ en centimes (économie de ~23%)
    interval: "annual",
    stripePriceId: "price_premium_annual", // À remplacer par le vrai ID Stripe  
    savings: "Économisez 35%",
    features: [
      "Événements illimités",
      "Invitations illimitées", 
      "Statistiques avancées",
      "Support prioritaire",
      "Messagerie avancée",
      "Export de données",
      "Sauvegarde automatique"
    ]
  }
];

export default function PaymentSetup({ isOpen, onClose, onSuccess }: PaymentSetupProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("premium-monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    
    try {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe n'a pas pu être initialisé");
      }

      const plan = subscriptionPlans.find(p => p.id === selectedPlan);
      if (!plan) {
        throw new Error("Plan non trouvé");
      }

      // Créer la session de checkout
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          planId: plan.id,
          interval: plan.interval,
        }),
      });

      const { sessionId, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      // Rediriger vers Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (error: any) {
      console.error('Erreur de paiement:', error);
      toast({
        title: "Erreur de paiement",
        description: error.message || "Une erreur est survenue lors de la configuration du paiement.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (priceInCents: number, interval: string) => {
    const price = (priceInCents / 100).toFixed(2);
    return `${price}€${interval === 'monthly' ? '/mois' : '/an'}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            🎉 Activez votre abonnement Premium
          </DialogTitle>
          <p className="text-center text-muted-foreground">
            Choisissez la durée de votre abonnement et commencez à profiter de toutes les fonctionnalités
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <RadioGroup
            value={selectedPlan}
            onValueChange={setSelectedPlan}
            className="grid md:grid-cols-2 gap-6"
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
                } ${plan.interval === 'annual' ? 'ring-2 ring-green-200 dark:ring-green-800' : ''}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.savings && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {plan.savings}
                        </Badge>
                      )}
                      {plan.interval === 'monthly' && (
                        <Badge variant="outline">
                          Le plus flexible
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="text-3xl font-bold">
                        {formatPrice(plan.price, plan.interval)}
                      </div>
                      {plan.interval === 'annual' && (
                        <div className="text-sm text-muted-foreground">
                          Soit {(plan.price / 12 / 100).toFixed(2)}€/mois
                        </div>
                      )}
                    </div>
                    <CardDescription>
                      {plan.interval === 'monthly' 
                        ? 'Facturation mensuelle, résiliation à tout moment'
                        : 'Facturation annuelle, économies maximales'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center text-sm">
                          <i className="fas fa-check text-green-500 mr-3 w-4"></i>
                          <span>{feature}</span>
                        </div>
                      ))}
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