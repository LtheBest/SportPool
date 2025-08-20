Feature: Organisation Registration
  En tant qu'utilisateur
  Je veux pouvoir créer un compte organisation
  Pour gérer mes événements

  Background:
    Étant donné que je suis sur la page d'inscription

  Scenario: Inscription réussie avec toutes les informations requises
    Quand je remplis le formulaire d'inscription avec :
      | name                | Test Organization        |
      | type                | association              |
      | email               | test@example.com         |
      | phone               | 0123456789              |
      | address             | 123 Rue de Test         |
      | description         | Une organisation de test |
      | contactFirstName    | John                    |
      | contactLastName     | Doe                     |
      | sirenNumber         | 123456789               |
      | password            | motdepasse123           |
    Et je clique sur le bouton "S'inscrire"
    Alors je devrais être redirigé vers le tableau de bord
    Et je devrais voir un message de confirmation

  Scenario: Inscription avec numéro SIREN invalide
    Quand je remplis le formulaire d'inscription avec :
      | name                | Test Organization        |
      | type                | association              |
      | email               | test@example.com         |
      | sirenNumber         | 12345                   |
      | password            | motdepasse123           |
    Et je clique sur le bouton "S'inscrire"
    Alors je devrais voir une erreur "Le numéro SIREN doit contenir 9 chiffres"

  Scenario: Inscription avec email déjà utilisé
    Étant donné qu'une organisation existe déjà avec l'email "existing@example.com"
    Quand je remplis le formulaire d'inscription avec l'email "existing@example.com"
    Et je clique sur le bouton "S'inscrire"
    Alors je devrais voir une erreur "Un compte avec cet email existe déjà"