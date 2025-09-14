import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AdminRegistrationModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: AdminRegistrationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    secretKey: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password || 
        !formData.firstName || !formData.lastName || !formData.secretKey) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 8 caractères.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/admin/register-super-user", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        secretKey: formData.secretKey,
      });

      const data = await response.json();
      
      toast({
        title: "Succès",
        description: "Administrateur créé avec succès !",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        secretKey: "",
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      console.error("Admin registration error:", error);
      toast({
        title: "Erreur",
        description: error.message || "Échec de la création de l'administrateur.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            🔐 Inscription Administrateur
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input 
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                placeholder="Jean"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input 
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                placeholder="Dupont"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nom de l'organisation</Label>
            <Input 
              id="name"
              type="text"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Administration TeamMove"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="admin@TeamMove.com"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input 
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange('password')}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input 
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="secretKey">Clé secrète</Label>
            <Input 
              id="secretKey"
              type="password"
              value={formData.secretKey}
              onChange={handleChange('secretKey')}
              placeholder="Clé secrète administrateur"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-yellow-800 text-sm">
              ⚠️ Cette fonctionnalité est réservée aux développeurs et administrateurs système.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Création...
              </>
            ) : (
              "Créer l'administrateur"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}