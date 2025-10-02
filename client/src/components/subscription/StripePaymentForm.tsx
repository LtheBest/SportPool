import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
  AddressElement,
  LinkAuthenticationElement,
} from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  CreditCard, 
  Lock, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  User,
  Mail,
  MapPin,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// Configuration Stripe
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLIC_KEY || 
  'pk_test_51S3zPW8XM0zNL8ZMhdeyjgfrp4eKmTmzKRMqRENFwKoUjfSByTeGfWXfcf6Vr6FF9FJSBauMvjTp6cnDFDJwfPxN00VrImPBXj'
);

// Types
interface PaymentFormProps {
  planId: string;
  planName: string;
  planPrice: number;
  currency: string;
  billingInterval: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PaymentFormData {
  email?: string;
  name?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// Styles personnalisés pour Stripe Elements
const stripeElementsOptions = {
  appearance: {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#3b82f6',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      spacingUnit: '4px',
      borderRadius: '6px',
    },
    rules: {
      '.Input': {
        border: '1px solid #d1d5db',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      '.Input:focus': {
        border: '1px solid #3b82f6',
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
      },
      '.Label': {
        fontWeight: '500',
        fontSize: '14px',
        color: '#374151',
      },
    },
  },
};

// Composant principal du formulaire de paiement
function PaymentForm({ planId, planName, planPrice, currency, billingInterval, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PaymentFormData>({});
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentElementReady, setPaymentElementReady] = useState(false);

  // Initialiser l'intention de paiement
  useEffect(() => {
    const initializePayment = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            planId,
            amount: planPrice,
            currency: currency.toLowerCase(),
            automatic_payment_methods: { enabled: true },
          }),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création de l\'intention de paiement');
        }

        const { client_secret } = await response.json();
        setClientSecret(client_secret);
      } catch (error: any) {
        console.error('Erreur initialisation paiement:', error);
        setPaymentError(error.message);
        toast.error(error.message);
      }
    };

    initializePayment();
  }, [planId, planPrice, currency]);

  // Formatage du prix
  const formatPrice = (price: number, curr: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: curr,
    }).format(price / 100);
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      toast.error('Stripe n\'est pas encore chargé. Veuillez patienter.');
      return;
    }

    if (!paymentElementReady) {
      toast.error('Le formulaire de paiement n\'est pas prêt. Veuillez patienter.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard?payment=success`,
          payment_method_data: {
            billing_details: {
              name: formData.name,
              email: formData.email,
              address: formData.address,
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('Erreur paiement Stripe:', error);
        setPaymentError(error.message || 'Erreur lors du paiement');
        toast.error(error.message || 'Erreur lors du paiement');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Paiement réussi
        toast.success('Paiement réussi ! Activation de votre abonnement...');
        
        // Notifier le succès au parent
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        // Statut inattendu
        console.warn('Statut de paiement inattendu:', paymentIntent?.status);
        setPaymentError('Statut de paiement inattendu');
      }
    } catch (error: any) {
      console.error('Erreur lors de la confirmation du paiement:', error);
      setPaymentError('Erreur technique lors du paiement');
      toast.error('Erreur technique lors du paiement');
    } finally {
      setIsProcessing(false);
    }
  };

  // Rendu du composant
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Résumé de la commande */}
      <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Résumé de votre commande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{planName}</h3>
              <p className="text-sm text-gray-600">
                {billingInterval === 'monthly' ? 'Abonnement mensuel' : 
                 billingInterval === 'annual' ? 'Abonnement annuel' :
                 billingInterval === 'pack_single' ? 'Pack événement unique' :
                 billingInterval === 'pack_10' ? 'Pack 10 événements' : 
                 'Paiement unique'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(planPrice, currency)}
              </div>
              <div className="text-sm text-gray-500">
                {billingInterval === 'monthly' && '/mois'}
                {billingInterval === 'annual' && '/an'}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Activation immédiate après paiement</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>Résiliation possible à tout moment</span>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire de paiement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-700" />
            Informations de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Authentification par lien (email) */}
            <div className="space-y-2">
              <Label htmlFor="link-auth" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Adresse email
              </Label>
              <LinkAuthenticationElement
                id="link-auth"
                options={{
                  defaultValues: {
                    email: formData.email || '',
                  },
                }}
                onChange={(event) => {
                  if (event.value.email) {
                    setFormData(prev => ({
                      ...prev,
                      email: event.value.email,
                    }));
                  }
                }}
              />
            </div>

            <Separator />

            {/* Élément de paiement principal */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Moyens de paiement
              </Label>
              
              {clientSecret && (
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <PaymentElement
                    id="payment-element"
                    options={{
                      layout: 'accordion',
                      defaultValues: {
                        billingDetails: {
                          name: formData.name,
                          email: formData.email,
                          address: formData.address,
                        },
                      },
                    }}
                    onReady={() => {
                      setPaymentElementReady(true);
                    }}
                    onChange={(event) => {
                      if (event.error) {
                        setPaymentError(event.error.message);
                      } else {
                        setPaymentError(null);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Adresse de facturation */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Adresse de facturation
              </Label>
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <AddressElement
                  options={{
                    mode: 'billing',
                    allowedCountries: ['FR', 'BE', 'CH', 'CA', 'US'],
                    defaultValues: {
                      name: formData.name || '',
                      address: formData.address || {
                        line1: '',
                        city: '',
                        state: '',
                        postal_code: '',
                        country: 'FR',
                      },
                    },
                  }}
                  onChange={(event) => {
                    if (event.complete) {
                      setFormData(prev => ({
                        ...prev,
                        name: event.value.name,
                        address: event.value.address,
                      }));
                    }
                  }}
                />
              </div>
            </div>

            {/* Message d'erreur */}
            {paymentError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Annuler
              </Button>
              
              <Button
                type="submit"
                disabled={!stripe || !paymentElementReady || isProcessing}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Payer {formatPrice(planPrice, currency)}
                  </>
                )}
              </Button>
            </div>

            {/* Informations de sécurité */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Paiement sécurisé</h4>
                  <p className="text-xs text-gray-600">
                    Vos informations de paiement sont cryptées et traitées de manière 
                    sécurisée par Stripe. Nous ne stockons jamais vos données de carte bancaire.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Cryptage SSL
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      PCI DSS
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Conformité RGPD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper avec Elements Provider
export function StripePaymentForm(props: PaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        ...stripeElementsOptions,
        mode: 'payment',
        currency: props.currency.toLowerCase(),
        amount: props.planPrice,
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
}

export default StripePaymentForm;