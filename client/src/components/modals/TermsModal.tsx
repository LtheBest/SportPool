import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export default function TermsModal({ isOpen, onClose, type }: TermsModalProps) {
  const title = type === 'terms' ? "Conditions d'utilisation" : "Politique de confidentialité";

  const termsContent = (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="text-lg font-semibold mb-3">1. Objet</h3>
        <p className="text-gray-600">
          Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de la plateforme 
          CovoitSport, une application de covoiturage dédiée aux événements sportifs.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">2. Définitions</h3>
        <ul className="space-y-2 text-gray-600">
          <li><strong>Plateforme :</strong> L'application web CovoitSport accessible via navigateur</li>
          <li><strong>Utilisateur :</strong> Toute personne physique ou morale utilisant la plateforme</li>
          <li><strong>Organisation :</strong> Club, association ou entreprise créant des événements</li>
          <li><strong>Événement :</strong> Activité sportive organisée via la plateforme</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">3. Inscription et compte</h3>
        <div className="space-y-2 text-gray-600">
          <p>
            L'inscription sur la plateforme est réservée aux organisations (clubs, associations, entreprises) 
            souhaitant organiser des événements sportifs avec système de covoiturage.
          </p>
          <p>
            L'utilisateur s'engage à fournir des informations exactes et à maintenir ses données à jour.
          </p>
          <p>
            Chaque organisation est responsable de la sécurité de ses identifiants de connexion.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">4. Utilisation de la plateforme</h3>
        <div className="space-y-2 text-gray-600">
          <p>La plateforme permet aux organisations de :</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Créer et gérer des événements sportifs</li>
            <li>Inviter des participants par email</li>
            <li>Organiser le covoiturage pour les événements</li>
            <li>Communiquer avec les participants</li>
            <li>Générer des rapports et statistiques</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">5. Responsabilités</h3>
        <div className="space-y-2 text-gray-600">
          <p>
            <strong>L'organisation :</strong> est responsable des événements qu'elle organise, 
            de la véracité des informations communiquées et du respect de la réglementation en vigueur.
          </p>
          <p>
            <strong>CovoitSport :</strong> fournit uniquement les outils techniques permettant l'organisation. 
            La plateforme ne saurait être tenue responsable des incidents lors des trajets ou événements.
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">6. Données personnelles</h3>
        <p className="text-gray-600">
          Les données collectées sont nécessaires au fonctionnement de la plateforme. 
          Consulter notre politique de confidentialité pour plus d'informations.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">7. Propriété intellectuelle</h3>
        <p className="text-gray-600">
          Tous les éléments de la plateforme (design, code, marques, etc.) sont protégés par 
          le droit de la propriété intellectuelle.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">8. Modification des CGU</h3>
        <p className="text-gray-600">
          CovoitSport se réserve le droit de modifier les présentes CGU. Les utilisateurs seront 
          informés des modifications par email ou via la plateforme.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">9. Droit applicable</h3>
        <p className="text-gray-600">
          Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux 
          tribunaux compétents de Paris.
        </p>
      </section>

      <section className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">
          <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}
        </p>
      </section>
    </div>
  );

  const privacyContent = (
    <div className="space-y-6 text-sm">
      <section>
        <h3 className="text-lg font-semibold mb-3">1. Collecte des données</h3>
        <div className="space-y-2 text-gray-600">
          <p>Nous collectons les données suivantes :</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Informations d'inscription (nom, email, téléphone, adresse)</li>
            <li>Données d'utilisation de la plateforme</li>
            <li>Informations sur les événements créés</li>
            <li>Historique des communications</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">2. Utilisation des données</h3>
        <div className="space-y-2 text-gray-600">
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Fournir les services de la plateforme</li>
            <li>Envoyer les invitations et notifications</li>
            <li>Améliorer nos services</li>
            <li>Respecter nos obligations légales</li>
          </ul>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">3. Partage des données</h3>
        <p className="text-gray-600">
          Nous ne vendons pas vos données. Elles peuvent être partagées uniquement avec :
        </p>
        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-600">
          <li>Les participants aux événements (coordonnées de contact)</li>
          <li>Nos prestataires techniques (hébergement, email)</li>
          <li>Les autorités en cas d'obligation légale</li>
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">4. Vos droits</h3>
        <div className="space-y-2 text-gray-600">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Droit d'accès à vos données</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement</li>
            <li>Droit à la portabilité</li>
            <li>Droit d'opposition</li>
          </ul>
          <p className="mt-2">
            Pour exercer ces droits, contactez-nous à : <strong>privacy@covoitsport.fr</strong>
          </p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">5. Sécurité</h3>
        <p className="text-gray-600">
          Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles 
          pour protéger vos données contre tout accès non autorisé, altération ou destruction.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">6. Conservation</h3>
        <p className="text-gray-600">
          Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles 
          elles ont été collectées, dans le respect de la réglementation en vigueur.
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">7. Cookies</h3>
        <p className="text-gray-600">
          Notre site utilise des cookies techniques nécessaires au fonctionnement de la plateforme. 
          Aucun cookie publicitaire ou de traçage n'est utilisé.
        </p>
      </section>

      <section className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-500">
          <strong>Contact DPO :</strong> privacy@covoitsport.fr<br/>
          <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR')}
        </p>
      </section>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          {type === 'terms' ? termsContent : privacyContent}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}