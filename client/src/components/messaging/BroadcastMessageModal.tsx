import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMessaging } from "@/contexts/MessagingContext";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";

interface BroadcastMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export default function BroadcastMessageModal({ isOpen, onClose, event }: BroadcastMessageModalProps) {
  const [message, setMessage] = useState("");
  const { sendBroadcastMessage, isLoading } = useMessaging();
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim() || !event) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un message.",
        variant: "destructive",
      });
      return;
    }

    try {
      await sendBroadcastMessage(event.id, message.trim());
      setMessage("");
      onClose();
      
      toast({
        title: "Message diffusé",
        description: `Message envoyé à tous les participants de "${event.name}" par email.`,
      });
    } catch (error) {
      console.error("Broadcast error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Envoyer un message à tous les participants
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-calendar text-white"></i>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{event.name}</h3>
                <p className="text-sm text-gray-600">
                  <i className="fas fa-map-marker-alt mr-1"></i>
                  {event.destination}
                </p>
                <p className="text-sm text-gray-600">
                  <i className="fas fa-clock mr-1"></i>
                  {new Date(event.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Message Composition */}
          <div className="space-y-3">
            <Label htmlFor="message" className="text-base font-semibold">
              Votre message
            </Label>
            <Textarea
              id="message"
              placeholder="Tapez votre message ici... Il sera envoyé par email à tous les participants avec un bouton 'Répondre' qui leur permettra de vous contacter directement."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
            <div className="text-sm text-gray-500">
              <i className="fas fa-info-circle mr-1"></i>
              Ce message sera envoyé par email à tous les participants. Ils pourront répondre en cliquant sur le bouton "Répondre" dans l'email.
            </div>
          </div>

          {/* Email Preview Info */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">
              <i className="fas fa-envelope mr-1"></i>
              Aperçu de l'email
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Sujet:</strong> Message de l'organisateur - {event.name}</li>
              <li>• <strong>Contenu:</strong> Votre message personnalisé</li>
              <li>• <strong>Action:</strong> Bouton "Répondre" pour répondre directement</li>
              <li>• <strong>Destinataires:</strong> Tous les participants inscrits</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={isLoading || !message.trim()}
              className="bg-primary hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Envoi en cours...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane mr-2"></i>
                  Envoyer à tous
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}