import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
}

export default function InviteModal({ isOpen, onClose, eventId }: InviteModalProps) {
  const [emailsText, setEmailsText] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async (data: { emails: string[]; message?: string }) => {
      if (!eventId) throw new Error("Aucun événement sélectionné");
      
      // Create invitations for each email
      const promises = data.emails.map(email =>
        apiRequest("POST", `/api/events/${eventId}/invite`, {
          email: email.trim(),
          customMessage: data.message,
        })
      );
      
      return Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/participants`] });
      onClose();
      setEmailsText("");
      setMessage("");
      toast({
        title: "Invitations envoyées",
        description: `${variables.emails.length} invitation(s) envoyée(s) avec succès.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer les invitations.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailsText.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir au moins une adresse email.",
        variant: "destructive",
      });
      return;
    }

    // Parse emails from text (comma, semicolon, or newline separated)
    const emails = emailsText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes("@"));

    if (emails.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucune adresse email valide trouvée.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates and invalid emails
    const validEmails = Array.from(new Set(emails)).filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    });

    if (validEmails.length === 0) {
      toast({
        title: "Erreur",
        description: "Aucune adresse email valide trouvée.",
        variant: "destructive",
      });
      return;
    }

    if (validEmails.length !== emails.length) {
      toast({
        title: "Attention",
        description: `${emails.length - validEmails.length} adresse(s) email invalide(s) ignorée(s).`,
      });
    }

    inviteMutation.mutate({
      emails: validEmails,
      message: message.trim() || undefined,
    });
  };

  const parseEmails = () => {
    if (!emailsText.trim()) return [];
    
    return emailsText
      .split(/[,;\n]/)
      .map(email => email.trim())
      .filter(email => email && email.includes("@"));
  };

  const emails = parseEmails();
  const validEmails = emails.filter(email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">Inviter des membres</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="emails" className="text-sm font-medium text-gray-700">
              Adresses email
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              Séparez les adresses par des virgules, points-virgules ou saut de ligne
            </p>
            <Textarea
              id="emails"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              rows={4}
              placeholder="membre1@email.com, membre2@email.com&#10;membre3@email.com"
              className="resize-none"
            />
            
            {emails.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-1">
                  {validEmails.length} email(s) valide(s) détecté(s)
                  {emails.length !== validEmails.length && 
                    ` (${emails.length - validEmails.length} invalide(s))`
                  }
                </div>
                <div className="flex flex-wrap gap-1">
                  {emails.slice(0, 5).map((email, index) => {
                    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                    return (
                      <Badge 
                        key={index} 
                        variant={isValid ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {email}
                      </Badge>
                    );
                  })}
                  {emails.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{emails.length - 5} autres
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="message" className="text-sm font-medium text-gray-700">
              Message d'invitation (optionnel)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Bonjour, je vous invite à participer à notre événement..."
              className="resize-none"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-blue-700"
              disabled={inviteMutation.isPending || validEmails.length === 0}
            >
              {inviteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi en cours...
                </>
              ) : (
                `Envoyer ${validEmails.length} invitation(s)`
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
