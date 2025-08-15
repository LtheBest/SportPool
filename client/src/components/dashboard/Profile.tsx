import React, { useRef, useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Organization } from "@shared/schema";

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const profileSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  type: z.enum(["club", "association", "company"]),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  contactFirstName: z.string().min(1, "Le prénom est requis"),
  contactLastName: z.string().min(1, "Le nom est requis"),
  sports: z.array(z.string()).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit faire au moins 6 caractères"),
  confirmPassword: z.string().min(1, "Veuillez confirmer le nouveau mot de passe"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

export default function Profile() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // stable ref for file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // preview URL (local preview or server URL with bust query)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    // If org provides a logo, initialize preview with bust to avoid stale cache
    if (organization?.logoUrl) {
      setLogoPreview(`${organization.logoUrl}?t=${Date.now()}`);
    } else {
      setLogoPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.logoUrl]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: organization?.name || "",
      type: (organization?.type as "club" | "association" | "company") || "club",
      email: organization?.email || "",
      phone: organization?.phone || "",
      address: organization?.address || "",
      description: organization?.description || "",
      contactFirstName: organization?.contactFirstName || "",
      contactLastName: organization?.contactLastName || "",
      sports: organization?.sports || [],
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiRequest("PUT", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => apiRequest("PUT", "/api/profile", { password: data.newPassword }),
    onSuccess: () => {
      passwordForm.reset();
      setShowPasswordForm(false);
      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    },
  });

  const onSubmitProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const sports = ["Football", "Basketball", "Tennis", "Handball", "Hockey", "Course à pied", "Cyclisme", "Natation"];

  // cleanup: revoke local object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      // revoke if logoPreview is a blob url
      if (logoPreview && logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon profil</h1>
        <p className="text-gray-600">Gérez les informations de votre organisation.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProfile)} className="space-y-6">
              {/* Profile Image */}
              <div className="flex items-center space-x-6">
                <img
                  src={logoPreview || organization?.logoUrl || "/placeholder_logo.png"}
                  alt="logo"
                  className="w-24 h-24 rounded-full object-cover"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Photo de profil</h3>
                  <p className="text-gray-600 text-sm">Téléchargez le logo de votre organisation</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      // immediate local preview
                      const localUrl = URL.createObjectURL(file);
                      // revoke previous blob if any
                      if (logoPreview && logoPreview.startsWith("blob:")) {
                        URL.revokeObjectURL(logoPreview);
                      }
                      setLogoPreview(localUrl);

                      const fd = new FormData();
                      fd.append("logo", file);

                      try {
                        const res = await fetch("/api/profile/logo", {
                          method: "POST",
                          body: fd,
                          credentials: "include", // important for session cookie
                        });
                        if (!res.ok) {
                          const text = await res.text().catch(() => null);
                          throw new Error(text || "Upload échoué");
                        }
                        const { url } = await res.json(); // ex: /uploads/xxx.png

                        // update React Query cache immediately (more reactive)
                        queryClient.setQueryData(["/api/me"], (old: any) => {
                          if (!old) return old;
                          return { ...old, logoUrl: `${url}?t=${Date.now()}` };
                        });
                        // also invalidate to trigger refetch elsewhere
                        queryClient.invalidateQueries({ queryKey: ["/api/me"] });

                        // replace preview with server URL + cache bust
                        // revoke local blob url
                        if (localUrl.startsWith("blob:")) {
                          URL.revokeObjectURL(localUrl);
                        }
                        setLogoPreview(`${url}?t=${Date.now()}`);

                        toast({ title: "Logo mis à jour" });
                      } catch (err: any) {
                        // restore previous value on error
                        setLogoPreview(organization?.logoUrl || null);
                        toast({
                          title: "Erreur",
                          description: err?.message || "Upload échoué",
                          variant: "destructive",
                        });
                      } finally {
                        // clear the file input value so same file can be re-uploaded if needed
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }
                    }}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Changer la photo
                  </Button>
                </div>
              </div>

              {/* Organization Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'organisation</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Type d'organisation</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="club">Club sportif</SelectItem>
                          <SelectItem value="association">Association</SelectItem>
                          <SelectItem value="company">Entreprise</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de contact</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Téléphone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="contactFirstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom du contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>Nom du contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Décrivez votre organisation, ses activités, ses valeurs..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sports & Activities */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-4 block">Sports pratiqués</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sports.map((sport) => (
                    <div key={sport} className="flex items-center space-x-2">
                      <Checkbox
                        id={sport}
                        checked={form.watch("sports")?.includes(sport)}
                        onCheckedChange={(checked) => {
                          const currentSports = form.getValues("sports") || [];
                          if (checked) {
                            form.setValue("sports", [...currentSports, sport]);
                          } else {
                            form.setValue("sports", currentSports.filter(s => s !== sport));
                          }
                        }}
                      />
                      <Label htmlFor={sport} className="text-sm text-gray-700">{sport}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-primary hover:bg-blue-700"
                >
                  {updateProfileMutation.isPending ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Security Settings */}
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Paramètres de sécurité</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                {showPasswordForm ? "Annuler" : "Modifier le mot de passe"}
              </Button>
            </div>

            {showPasswordForm && (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mot de passe actuel</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nouveau mot de passe</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updatePasswordMutation.isPending}
                      className="bg-primary hover:bg-blue-700"
                    >
                      {updatePasswordMutation.isPending ? "Modification..." : "Modifier le mot de passe"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
