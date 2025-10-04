import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useStripe } from "@/hooks/useStripe";
import { PlanSelector } from "@/components/stripe/PlanSelector";
import TermsModal from "./TermsModal";

const registrationSchema = z.object({
  name: z.string().min(1, "Le nom de l'organisation est requis"),
  type: z.enum(["club", "association", "company"], {
    required_error: "Veuillez sélectionner un type d'organisation",
  }),
  subscriptionType: z.string().min(1, "Veuillez choisir une offre"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactFirstName: z.string().min(1, "Le prénom est requis"),
  contactLastName: z.string().min(1, "Le nom est requis"),
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

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface ModernRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModernRegistrationModal({ isOpen, onClose }: ModernRegistrationModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const { register } = useAuth();
  const { redirectToCheckout } = useStripe();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      subscriptionType: "decouverte",
      type: "club",
      acceptTerms: false,
    },
  });

  const watchedPlan = form.watch("subscriptionType");
  const watchedData = form.watch();

  const steps = [
    { number: 1, title: "Informations organisation", description: "Détails de votre organisation" },
    { number: 2, title: "Contact et sécurité", description: "Informations de contact et mot de passe" },
    { number:3, title: "Choix de l'offre", description: "Sélectionnez votre plan d'abonnement" },
    { number: 4, title: "Conditions", description: "Acceptez les conditions d'utilisation" },
  ];

  const handleNext = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);
    
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getFieldsForStep = (step: number): (keyof RegistrationFormData)[] => {
    switch (step) {
      case 1:
        return ["name", "type"];
      case 2:
        return ["email", "contactFirstName", "contactLastName", "password", "confirmPassword"];
      case 3:
        return ["subscriptionType"];
      case 4:
        return ["acceptTerms"];
      default:
        return [];
    }
  };

  const handleSubmit = async (data: RegistrationFormData) => {
    setLoading(true);
    
    try {
      // Si plan gratuit, procéder directement à l'inscription
      if (data.subscriptionType === "decouverte") {
        const result = await register(data);
        
        if (result.success) {
          toast.success("Inscription réussie ! Bienvenue sur TeamMove !");
          onClose();
        } else {
          toast.error(result.error || "Erreur lors de l'inscription");
        }
      } else {
        // Plan payant - créer d'abord le compte puis rediriger vers Stripe
        const result = await register({
          ...data,
          subscriptionType: "decouverte" // Temporairement en découverte
        });
        
        if (result.success) {
          // Rediriger vers Stripe pour le paiement
          await redirectToCheckout(data.subscriptionType, 'registration');
        } else {
          toast.error(result.error || "Erreur lors de l'inscription");
        }
      }
    } catch (error: any) {
      console.error('Erreur inscription:', error);
      toast.error(error.message || "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const isLastStep = currentStep === steps.length;
  const canProceed = () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    return fieldsToValidate.every(field => !form.formState.errors[field]);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Créer un compte TeamMove</DialogTitle>
          </DialogHeader>

          {/* Indicateur d'étapes */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= step.number 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">{steps[currentStep - 1].title}</h3>
            <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              
              {/* Étape 1: Informations organisation */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom de l'organisation *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: AS Sporting Club" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type d'organisation *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-1 gap-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="club" id="club" />
                              <label htmlFor="club" className="text-sm">Club sportif</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="association" id="association" />
                              <label htmlFor="association" className="text-sm">Association</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="company" id="company" />
                              <label htmlFor="company" className="text-sm">Entreprise</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Étape 2: Contact et sécurité */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contact@organisation.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Jean" {...field} />
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
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Dupont" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="06 12 34 56 78" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showPassword ? "text" : "password"}
                              placeholder="Mot de passe sécurisé"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
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
                        <FormLabel>Confirmer le mot de passe *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirmez votre mot de passe"
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Étape 3: Choix de l'offre */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subscriptionType"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <PlanSelector
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {watchedPlan !== "decouverte" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        <strong>Paiement sécurisé avec Stripe</strong><br />
                        Après validation de votre inscription, vous serez redirigé vers notre partenaire Stripe pour effectuer le paiement de manière sécurisée.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Étape 4: Conditions */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <h3 className="text-lg font-semibold">Récapitulatif de votre inscription</h3>
                    
                    <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Organisation:</span>
                        <span className="font-medium">{watchedData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="font-medium">{watchedData.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Contact:</span>
                        <span className="font-medium">{watchedData.contactFirstName} {watchedData.contactLastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Plan sélectionné:</span>
                        <Badge variant="secondary">{watchedData.subscriptionType}</Badge>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="text-sm">
                            J'accepte les{" "}
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="text-primary hover:underline"
                            >
                              conditions d'utilisation
                            </button>{" "}
                            et la{" "}
                            <button
                              type="button"
                              onClick={() => setTermsOpen(true)}
                              className="text-primary hover:underline"
                            >
                              politique de confidentialité
                            </button>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Boutons de navigation */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>

                {!isLastStep ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading || !form.formState.isValid}
                    className="min-w-32"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {watchedPlan === "decouverte" ? "Inscription..." : "Redirection..."}
                      </>
                    ) : (
                      watchedPlan === "decouverte" ? "Créer mon compte" : "Procéder au paiement"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <TermsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}