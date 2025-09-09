import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

interface ReplyData {
  eventName: string;
  organizerName: string;
  originalMessage: string;
  messageDate: string;
}

export default function ReplyMessage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [replyData, setReplyData] = useState<ReplyData | null>(null);
  const [token, setToken] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Extraire le token depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token') || urlParams.get('replyToken');
    
    if (!urlToken) {
      toast({
        title: "Erreur",
        description: "Token de réponse manquant",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    setToken(urlToken);
    
    // Charger les données de la réponse
    fetchReplyData(urlToken);
  }, []);

  const fetchReplyData = async (replyToken: string) => {
    try {
      const response = await apiRequest("GET", `/api/reply-token/${replyToken}`);
      const data = await response.json();
      setReplyData(data);
      
      // Pré-remplir avec les données participant si disponibles
      if (data.participantName) setParticipantName(data.participantName);
      if (data.participantEmail) setParticipantEmail(data.participantEmail);
    } catch (error) {
      console.error("Error fetching reply data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de réponse",
        variant: "destructive",
      });
      setLocation("/");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reply.trim() || !participantName.trim() || !participantEmail.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await apiRequest("POST", `/api/reply-message/${token}`, {
        content: reply.trim(),
        participantName: participantName.trim(),
        participantEmail: participantEmail.trim(),
      });

      setIsSubmitted(true);
      
      toast({
        title: "Réponse envoyée",
        description: "Votre réponse a été envoyée à l'organisateur avec succès !",
      });
    } catch (error) {
      console.error("Reply error:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer votre réponse. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-check-circle text-green-600 text-2xl"></i>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Réponse Envoyée !
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">
              Votre réponse a été envoyée avec succès à l'organisateur. 
              Celui-ci la recevra dans sa messagerie du dashboard.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!replyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold flex items-center">
            <i className="fas fa-reply mr-3"></i>
            Répondre à l'organisateur
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Message Original */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-sm"></i>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{replyData.eventName}</h3>
                <p className="text-sm text-gray-600">
                  Message de {replyData.organizerName} • {replyData.messageDate}
                </p>
              </div>
            </div>
            <div className="pl-13">
              <p className="text-gray-700 italic">
                "{replyData.originalMessage}"
              </p>
            </div>
          </div>

          {/* Formulaire de réponse */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="participantName">Votre nom *</Label>
                <Input
                  id="participantName"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Entrez votre nom"
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="participantEmail">Votre email *</Label>
                <Input
                  id="participantEmail"
                  type="email"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  placeholder="Entrez votre email"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reply">Votre réponse *</Label>
              <Textarea
                id="reply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Tapez votre réponse ici..."
                className="min-h-[120px] resize-none"
                disabled={isLoading}
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !reply.trim() || !participantName.trim() || !participantEmail.trim()}
                className="bg-primary hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-2"></i>
                    Envoyer la réponse
                  </>
                )}
              </Button>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-2">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">À propos de cette réponse :</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Votre réponse sera envoyée directement à l'organisateur</li>
                  <li>• Elle apparaîtra dans sa messagerie du dashboard</li>
                  <li>• L'organisateur pourra vous répondre directement par email</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}