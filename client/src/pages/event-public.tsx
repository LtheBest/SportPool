import { useParams } from "wouter";
import EventPublicView from "@/components/public/EventPublicView";

export default function EventPublic() {
  const params = useParams();
  const eventId = params.id;

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Événement introuvable</h1>
          <p className="text-gray-600">L'identifiant de l'événement est manquant.</p>
        </div>
      </div>
    );
  }

  return <EventPublicView eventId={eventId} />;
}