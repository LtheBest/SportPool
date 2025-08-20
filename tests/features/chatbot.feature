Feature: Chatbot intelligent
  En tant qu'utilisateur
  Je veux pouvoir interagir avec un chatbot
  Pour obtenir de l'aide et des suggestions

  Background:
    Étant donné que je suis sur l'interface de chatbot

  Scenario: Demande d'aide générale
    Quand j'envoie le message "Comment créer un événement ?"
    Alors le chatbot devrait répondre avec des instructions
    Et la réponse devrait contenir "créer" et "événement"

  Scenario: Suggestions d'événements sportifs
    Quand j'envoie le message "Suggère-moi des événements de football"
    Alors le chatbot devrait suggérer des événements de football
    Et les suggestions devraient inclure des détails pratiques

  Scenario: Aide spécifique à l'organisation
    Étant donné que je suis connecté en tant qu'organisation de type "club"
    Quand je demande "Comment gérer mes membres ?"
    Alors le chatbot devrait fournir des conseils adaptés aux clubs
    Et mentionner les fonctionnalités spécifiques à mon type d'organisation

  Scenario: Question sur le covoiturage
    Quand j'envoie le message "Comment organiser le covoiturage pour mes événements ?"
    Alors le chatbot devrait expliquer le système de covoiturage
    Et donner des conseils pratiques sur la gestion des conducteurs et passagers

  Scenario: Gestion des erreurs du chatbot
    Quand l'API OpenAI n'est pas disponible
    Et j'envoie un message au chatbot
    Alors je devrais recevoir un message d'erreur approprié
    Et être invité à réessayer ou contacter le support