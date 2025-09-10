import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DemoModal({ isOpen, onClose }: DemoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Démonstration de la plateforme
          </DialogTitle>
        </DialogHeader>

        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Demo placeholder - in a real app this would be a video player */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20zm10 0c0-11.046-8.954-20-20-20s-20 8.954-20 20 8.954 20 20 20 20-8.954 20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Mock video content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white z-10">
              <div className="mb-4">
                <i className="fas fa-car text-6xl opacity-60 mb-4"></i>
                <h3 className="text-2xl font-bold mb-2">TEAM MOVE en action</h3>
                <p className="text-white/80 max-w-md mx-auto">
                  A venir : une vidéo de démonstration de 3 minutes montrant les principales fonctionnalités de la plateforme.
                </p>
              </div>
              
              <Button 
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all duration-300"
                size="lg"
                onClick={() => {
                  // In a real implementation, this would start video playback
                  console.log("Demo video would start playing");
                }}
              >
                <i className="fas fa-play mr-2"></i>
                Lancer la démonstration
              </Button>
            </div>
          </div>

          {/* Feature highlights overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white/60 text-sm">
            <span><i className="fas fa-calendar mr-1"></i> Gestion d'événements</span>
            <span><i className="fas fa-users mr-1"></i> Invitations automatiques</span>
            <span><i className="fas fa-car mr-1"></i> Optimisation des trajets</span>
          </div>
        </div>

        <p className="text-gray-600 text-center">
          Découvrez comment TEAM MOVE simplifie l'organisation de vos covoiturages sportifs en 3 minutes.
        </p>

        {/* Demo features list */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <i className="fas fa-user-plus text-primary text-xl mb-2"></i>
            <h4 className="font-semibold text-sm text-gray-900">Inscription simple</h4>
            <p className="text-xs text-gray-600">Interface intuitive pour clubs et associations</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <i className="fas fa-envelope text-secondary text-xl mb-2"></i>
            <h4 className="font-semibold text-sm text-gray-900">Invitations email</h4>
            <p className="text-xs text-gray-600">Système d'invitation automatisé</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <i className="fas fa-chart-line text-accent text-xl mb-2"></i>
            <h4 className="font-semibold text-sm text-gray-900">Tableau de bord</h4>
            <p className="text-xs text-gray-600">Suivi en temps réel des événements</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
