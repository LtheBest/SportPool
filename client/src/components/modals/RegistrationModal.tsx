// client/src/components/modals/RegistrationModal.tsx
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import TermsModal from "@/components/modals/TermsModal";
import { buildApiUrl, defaultHeaders } from "@/lib/config";

const registrationSchema = z.object({
  name: z.string().min(1, "Le nom de l'organisation est requis"),
  type: z.enum(["club", "association", "company"], {
    required_error: "Veuillez sélectionner un type d'organisation",
  }),
  selectedPlan: z.enum(["decouverte", "evenementielle", "pro_club", "pro_pme", "pro_entreprise"], {
    required_error: "Veuillez choisir une offre",
  }),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactFirstName: z.string().min(1, "Le prénom est requis"),
  contactLastName: z.string().min(1, "Le nom est requis"),
  sirenNumber: z.string()
    .optional()
    .refine((val) => !val || (val.length === 9 && /^\d{9}$/.test(val)), {
      message: "Le numéro SIREN doit contenir exactement 9 chiffres"
    }),
  password: z.string()
    .min(8, "Le mot de passe doit faire au moins 8 caractères")
    .regex(/[a-z]/, "Le mot de passe doit contenir au moins une lettre minuscule")
    .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
    .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Le mot de passe doit contenir au moins un caractère spécial"),
  confirmPassword: z.string().min(1, "Veuillez confirmer le mot de passe"),
  acceptTerms: z.boolean().refine((val) => val === true, "Vous devez accepter les conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowLogin: () => void;
}

export default function RegistrationModal({ isOpen, onClose, onShowLogin }: RegistrationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsModalType, setTermsModalType] = useState<'terms' | 'privacy'>('terms');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const form = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      type: undefined,
      selectedPlan: undefined,
      email: "",
      phone: "",
      address: "",
      contactFirstName: "",
      contactLastName: "",
      sirenNumber: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  // Watch the selected organization type and subscription type to keep them highlighted
  const selectedType = useWatch({
    control: form.control,
    name: "type"
  });

  const selectedPlan = useWatch({
    control: form.control,
    name: "selectedPlan"
  });

  const handleTermsClick = (type: 'terms' | 'privacy') => {
    setTermsModalType(type);
    setShowTermsModal(true);
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);

    try {
      const { confirmPassword, acceptTerms, ...registerData } = data;

      // Ajouter le plan sélectionné aux données d'inscription
      const registrationPayload = {
        ...registerData,
        selectedPlan: data.selectedPlan
      };

      // Use proper API request for registration (public endpoint)
      const response = await fetch(buildApiUrl("/api/register"), {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(registrationPayload),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Erreur d'inscription");
      }

      // IMPORTANT: Stocker les tokens JWT dès que l'inscription est réussie
      if (result.accessToken && result.refreshToken) {
        // Utiliser localStorage pour stocker les tokens
        localStorage.setItem('TeamMove_access_token', result.accessToken);
        localStorage.setItem('TeamMove_refresh_token', result.refreshToken);
        
        console.log('✅ JWT tokens stored successfully after registration');
      }

      // Si l'inscription nécessite un paiement
      if (result.requiresPayment && result.checkoutUrl) {
        // L'utilisateur a un compte créé avec des tokens JWT stockés
        // Maintenant on le redirige vers Stripe Checkout pour le paiement
        console.log('🔄 Redirecting to Stripe Checkout:', result.checkoutUrl);
        window.location.href = result.checkoutUrl;
        return;
      }

      // Si c'est une inscription découverte (gratuite)
      if (result.planType === 'decouverte') {
        // Invalider les requêtes pour rafraîchir les données utilisateur
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });

        // Rediriger vers le dashboard
        setLocation("/dashboard");
        onClose();

        toast({
          title: "Inscription réussie",
          description: "Votre compte découverte a été créé avec succès. Vous êtes maintenant connecté.",
        });
      } else {
        // Cas d'erreur de paiement temporaire ou autre
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        setLocation("/dashboard");
        onClose();

        toast({
          title: "Compte créé",
          description: result.message || "Votre compte a été créé avec l'offre Découverte.",
          variant: result.paymentError ? "destructive" : "default",
        });
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const organizationTypes = [
    {
      value: "club",
      icon: "fas fa-users",
      title: "Clubs & Associations",
      description: "Structures locales et fédérées",
      color: "text-primary",
    },
    {
      value: "association",
      icon: "fas fa-briefcase",
      title: "PME",
      description: "Petites et moyennes entreprises",
      color: "text-secondary",
    },
    {
      value: "company",
      icon: "fas fa-city",
      title: "Grandes Entreprises",
      description: "Groupes nationaux et internationaux",
      color: "text-accent",
    },

  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Créer un compte</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Organization Type Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Type d'organisation</h3>
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid md:grid-cols-3 gap-4"
                      >
                        {organizationTypes.map((type) => (
                          <FormItem key={type.value}>
                            <FormControl>
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="sr-only peer"
                              />
                            </FormControl>
                            <Label
                              htmlFor={type.value}
                              className={`relative cursor-pointer flex flex-col items-center p-4 border-2 rounded-lg transition-all duration-200 ${selectedType === type.value
                                  ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                  : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                }`}
                            >
                              <i className={`${type.icon} text-2xl ${type.color} mb-2`}></i>
                              <div className="font-semibold text-gray-900">{type.title}</div>
                              <div className="text-sm text-gray-600 text-center">{type.description}</div>
                            </Label>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Subscription Plan Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choisissez votre offre</h3>
              <FormField
                control={form.control}
                name="selectedPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid 2xl:grid-cols-5 xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-2 gap-8 lg:gap-10"
                      >
                        {/* Offre Découverte */}
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem
                              value="decouverte"
                              id="decouverte"
                              className="sr-only peer"
                            />
                          </FormControl>
                          <Label
                            htmlFor="decouverte"
                            className={`relative cursor-pointer block p-8 lg:p-6 xl:p-8 border-2 rounded-xl transition-all duration-200 ${selectedPlan === "decouverte"
                                ? 'border-green-500 bg-green-50 shadow-lg scale-[1.02] dark:bg-green-950 dark:border-green-400'
                                : 'border-gray-200 hover:border-green-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-green-400 dark:hover:bg-gray-800'
                              }`}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    🚀 Découverte
                                  </CardTitle>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                    GRATUIT
                                  </Badge>
                                </div>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                  Parfait pour tester notre plateforme
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-3">
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-green-500 mr-2"></i>
                                    <span>1 événement maximum</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-green-500 mr-2"></i>
                                    <span>Jusqu'à 20 invitations</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-green-500 mr-2"></i>
                                    <span>Gestion du covoiturage</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-green-500 mr-2"></i>
                                    <span>Support par email</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </FormItem>

                        {/* Offre Événementielle */}
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem
                              value="evenementielle"
                              id="evenementielle"
                              className="sr-only peer"
                            />
                          </FormControl>
                          <Label
                            htmlFor="evenementielle"
                            className={`relative cursor-pointer block p-8 lg:p-6 xl:p-8 border-2 rounded-xl transition-all duration-200 ${selectedPlan === "evenementielle"
                                ? 'border-orange-500 bg-orange-50 shadow-lg scale-[1.02] dark:bg-orange-950 dark:border-orange-400'
                                : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-orange-400 dark:hover:bg-gray-800'
                              }`}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    🎯 Événementielle
                                  </CardTitle>
                                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                    POPULAIRE
                                  </Badge>
                                </div>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                  Idéal pour les organisateurs occasionnels
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mb-4">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    15€ - 150€
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/pack</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-orange-500 mr-2"></i>
                                    <span>1 événement (15€) ou 10 événements (150€)</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-orange-500 mr-2"></i>
                                    <span>Invitations illimitées</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-orange-500 mr-2"></i>
                                    <span>Valable 12 mois</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-orange-500 mr-2"></i>
                                    <span>Support prioritaire</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </FormItem>

                        {/* Formule Pro Club */}
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem
                              value="pro_club"
                              id="pro_club"
                              className="sr-only peer"
                            />
                          </FormControl>
                          <Label
                            htmlFor="pro_club"
                            className={`relative cursor-pointer block p-8 lg:p-6 xl:p-8 border-2 rounded-xl transition-all duration-200 ${selectedPlan === "pro_club"
                                ? 'border-blue-500 bg-blue-50 shadow-lg scale-[1.02] dark:bg-blue-950 dark:border-blue-400'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-blue-400 dark:hover:bg-gray-800'
                              }`}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    🏆 Clubs & Associations
                                  </CardTitle>
                                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                                    PRO
                                  </Badge>
                                </div>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                  Pour les clubs sportifs et associations
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mb-4">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    19,99€
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mois</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-blue-500 mr-2"></i>
                                    <span><strong>Événements illimités</strong></span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-blue-500 mr-2"></i>
                                    <span><strong>Invitations illimitées</strong></span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-blue-500 mr-2"></i>
                                    <span>Branding personnalisé</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-blue-500 mr-2"></i>
                                    <span>API d'intégration</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </FormItem>

                        {/* Formule Pro PME */}
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem
                              value="pro_pme"
                              id="pro_pme"
                              className="sr-only peer"
                            />
                          </FormControl>
                          <Label
                            htmlFor="pro_pme"
                            className={`relative cursor-pointer block p-8 lg:p-6 xl:p-8 border-2 rounded-xl transition-all duration-200 ${selectedPlan === "pro_pme"
                                ? 'border-purple-500 bg-purple-50 shadow-lg scale-[1.02] dark:bg-purple-950 dark:border-purple-400'
                                : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-purple-400 dark:hover:bg-gray-800'
                              }`}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    🏢 PME
                                  </CardTitle>
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                                    BUSINESS
                                  </Badge>
                                </div>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                  Idéal pour les petites et moyennes entreprises
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mb-4">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    49€
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mois</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-purple-500 mr-2"></i>
                                    <span>Tout de Clubs & Associations</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-purple-500 mr-2"></i>
                                    <span>Multi-utilisateurs (5 admins)</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-purple-500 mr-2"></i>
                                    <span>Support téléphonique</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-purple-500 mr-2"></i>
                                    <span>Formation personnalisée</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </FormItem>

                        {/* Formule Pro Entreprise */}
                        <FormItem>
                          <FormControl>
                            <RadioGroupItem
                              value="pro_entreprise"
                              id="pro_entreprise"
                              className="sr-only peer"
                            />
                          </FormControl>
                          <Label
                            htmlFor="pro_entreprise"
                            className={`relative cursor-pointer block p-8 lg:p-6 xl:p-8 border-2 rounded-xl transition-all duration-200 ${selectedPlan === "pro_entreprise"
                                ? 'border-yellow-500 bg-yellow-50 shadow-lg scale-[1.02] dark:bg-yellow-950 dark:border-yellow-400'
                                : 'border-gray-200 hover:border-yellow-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-yellow-400 dark:hover:bg-gray-800'
                              }`}
                          >
                            <Card className="border-0 shadow-none bg-transparent">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                    🌟 Grandes Entreprises
                                  </CardTitle>
                                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                    ENTERPRISE
                                  </Badge>
                                </div>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                  Solution complète pour grandes entreprises
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="mb-4">
                                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    99€
                                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mois</span>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-yellow-500 mr-2"></i>
                                    <span>Tout de PME</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-yellow-500 mr-2"></i>
                                    <span>Multi-utilisateurs illimités</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-yellow-500 mr-2"></i>
                                    <span>Support 24/7</span>
                                  </div>
                                  <div className="flex items-center text-sm">
                                    <i className="fas fa-check text-yellow-500 mr-2"></i>
                                    <span>Account Manager dédié</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPlan && selectedPlan !== "decouverte" && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                  <div className="flex items-start space-x-2">
                    <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium">Configuration du paiement</p>
                      <p>Après la création de votre compte, vous serez redirigé vers la page de configuration du paiement sécurisé via Stripe pour activer votre abonnement.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'organisation</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="FC Barcelona" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de contact</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="contact@fcbarcelona.fr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactFirstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prénom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jean" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactLastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Dupont" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" placeholder="06 12 34 56 78" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sirenNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro SIREN (optionnel)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        placeholder="123456789"
                        maxLength={9}
                        onInput={(e) => {
                          // Only allow digits
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/\D/g, '');
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse (optionnel)</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Commencez à taper votre adresse..."
                      className="w-full"
                    />
                  </FormControl>
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Tapez au moins 3 caractères pour voir les suggestions d'adresses françaises
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-gray-600 cursor-pointer">
                      J'accepte les{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-primary hover:text-blue-700 underline"
                        onClick={() => handleTermsClick('terms')}
                      >
                        conditions d'utilisation
                      </Button>{" "}
                      et la{" "}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-primary hover:text-blue-700 underline"
                        onClick={() => handleTermsClick('privacy')}
                      >
                        politique de confidentialité
                      </Button>
                    </FormLabel>
                    <p className="text-xs text-gray-500">
                      * Requis pour créer un compte
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Création du compte...
                </>
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-gray-600">
            Déjà un compte ?{" "}
            <Button
              variant="link"
              onClick={onShowLogin}
              className="text-primary hover:text-blue-700 p-0"
              disabled={isLoading}
            >
              Se connecter
            </Button>
          </p>
        </div>
      </DialogContent>

      {/* Terms and Privacy Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        type={termsModalType}
      />
    </Dialog>
  );
}
