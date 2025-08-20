Feature: Gestion des événements
  En tant qu'organisation
  Je veux pouvoir créer et gérer des événements
  Pour organiser des activités

  Background:
    Étant donné que je suis connecté en tant qu'organisation

  Scenario: Création d'un nouvel événement
    Étant donné que je suis sur la page de création d'événement
    Quand je remplis le formulaire d'événement avec :
      | name          | Match de football amical |
      | sport         | Football                 |
      | description   | Match amical entre amis  |
      | date          | 2024-12-25 15:00        |
      | duration      | 2 heures                 |
      | meetingPoint  | Stade municipal          |
      | destination   | Terrain A               |
    Et je clique sur "Créer l'événement"
    Alors l'événement devrait être créé
    Et le compteur "Événements actifs" devrait être mis à jour
    Et je devrais voir l'événement dans ma liste

  Scenario: Participation à un événement
    Étant donné qu'un événement "Match de tennis" existe
    Et que je reçois une invitation par email
    Quand je clique sur le lien d'invitation
    Et je remplis le formulaire de participation avec :
      | name           | John Doe    |
      | role           | driver      |
      | availableSeats | 3           |
      | comment        | J'ai une voiture spacieuse |
    Et je clique sur "Confirmer ma participation"
    Alors ma participation devrait être enregistrée
    Et les compteurs suivants devraient être mis à jour :
      | Participants        | +1 |
      | Conducteurs         | +1 |
      | Places disponibles  | +3 |

  Scenario: Participation en tant que passager
    Étant donné qu'un événement "Randonnée" existe
    Et que je reçois une invitation par email
    Quand je clique sur le lien d'invitation
    Et je remplis le formulaire de participation avec :
      | name | Jane Smith  |
      | role | passenger   |
    Et je clique sur "Confirmer ma participation"
    Alors ma participation devrait être enregistrée
    Et les compteurs suivants devraient être mis à jour :
      | Participants        | +1 |
      | Places disponibles  | -1 |