import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const registrationSchema = z.object({
  name: z.string().min(1, "Le nom de l'organisation est requis"),
  type: z.enum(["club", "association", "company"], {
    required_error: "Veuillez sélectionner un type d'organisation",
  }),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactFirstName: z.string().min(1, "Le prénom est requis"),
  contactLastName: z.string().min(1, "Le nom est requis"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
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

  const form = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      type: undefined,
      email: "",
      phone: "",
      address: "",
      contactFirstName: "",
      contactLastName: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const registrationMutation = useMutation({
    mutationFn: (data: any) => {
      const { confirmPassword, acceptTerms, ...registerData } = data;
      return api.auth.register(registerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setLocation("/dashboard");
      onClose();
      toast({
        title: "Inscription réussie",
        description: "Votre compte a été créé avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur est survenue lors de l'inscription.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    registrationMutation.mutate(data);
  };

  const organizationTypes = [
    {
      value: "club",
      icon: "fas fa-users",
      title: "Club sportif",
      description: "Association sportive locale",
      color: "text-primary",
    },
    {
      value: "association",
      icon: "fas fa-heart",
      title: "Association",
      description: "Organisation à but non lucratif",
      color: "text-secondary",
    },
    {
      value: "company",
      icon: "fas fa-building",
      title: "Entreprise",
      description: "Société avec activités sportives",
      color: "text-accent",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                              className="relative cursor-pointer flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-primary peer-checked:border-primary peer-checked:bg-primary/5 transition-colors"
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
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresse (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="123 Rue du Sport, 75001 Paris" />
                  </FormControl>
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
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm text-gray-600">
                      J'accepte les{" "}
                      <Button variant="link" className="p-0 h-auto text-primary hover:text-blue-700">
                        conditions d'utilisation
                      </Button>{" "}
                      et la{" "}
                      <Button variant="link" className="p-0 h-auto text-primary hover:text-blue-700">
                        politique de confidentialité
                      </Button>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-blue-700"
              disabled={registrationMutation.isPending}
            >
              {registrationMutation.isPending ? (
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
            <Button variant="link" onClick={onShowLogin} className="text-primary hover:text-blue-700 p-0">
              Se connecter
            </Button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
