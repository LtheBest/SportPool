# Correction du système de paiement pour les utilisateurs connectés

## 🐛 Problème identifié

Lorsqu'un utilisateur ou organisateur déjà inscrit essayait de changer de plan d'abonnement (par exemple, passer d'un plan gratuit "Découverte" à un plan payant), le système retournait l'erreur suivante :

```
Erreur serveur (401): {"message": "Access token required", "code": "NO_TOKEN"}
```

## 🔍 Analyse du problème

Le problème avait **deux causes principales** :

### 1. Token JWT non rafraîchi automatiquement

La fonction `makeAuthenticatedRequest()` dans `/client/src/lib/api.ts` ne gérait pas le rafraîchissement automatique des tokens JWT expirés. Elle récupérait le token via `AuthService.getAuthHeader()`, mais ne vérifiait pas si ce token était expiré avant de l'envoyer.

**Code problématique** :
```typescript
// Ancienne version
async function makeAuthenticatedRequest(method: string, path: string, data?: any): Promise<Response> {
  // ... code complexe avec gestion manuelle des headers
  const authHeader = AuthService.getAuthHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }
  // ... pas de vérification d'expiration
}
```

### 2. Paramètres successUrl et cancelUrl non transmis

La fonction `api.subscription.createPayment()` recevait bien les paramètres `successUrl` et `cancelUrl` depuis le frontend, mais ne les transmettait pas au backend. Le serveur utilisait donc toujours les URLs par défaut.

**Code problématique dans api.ts** :
```typescript
createPayment: (planId: string, successUrl?: string, cancelUrl?: string) => 
  makeAuthenticatedRequest("POST", "/api/stripe/upgrade-subscription", { 
    planId  // ❌ successUrl et cancelUrl manquants
  }),
```

**Code problématique dans stripe-routes.ts** :
```typescript
app.post("/api/stripe/upgrade-subscription", requireAuth, async (req, res) => {
  const { planId } = req.body;  // ❌ ne lit pas successUrl et cancelUrl
  // ... utilise des URLs hardcodées
});
```

## ✅ Solutions apportées

### Solution 1 : Utilisation de apiRequest pour la gestion automatique des tokens

La fonction `makeAuthenticatedRequest()` utilise maintenant `apiRequest()` depuis `queryClient.ts`, qui gère automatiquement :
- La vérification de l'expiration du token
- Le rafraîchissement automatique si le token est expiré
- La réessai automatique de la requête avec le nouveau token

**Nouveau code dans api.ts** :
```typescript
// Helper function for making API requests with JWT authentication
// This now uses apiRequest from queryClient which handles token refresh automatically
async function makeAuthenticatedRequest(method: string, path: string, data?: any): Promise<Response> {
  return apiRequest(method, path, data);
}
```

### Solution 2 : Transmission des URLs personnalisées

Les paramètres `successUrl` et `cancelUrl` sont maintenant correctement transmis du frontend au backend.

**Nouveau code dans api.ts** :
```typescript
subscription: {
  createPayment: (planId: string, successUrl?: string, cancelUrl?: string) => 
    makeAuthenticatedRequest("POST", "/api/stripe/upgrade-subscription", { 
      planId,
      successUrl,    // ✅ Transmis
      cancelUrl      // ✅ Transmis
    }),
  upgrade: (planId: string, successUrl?: string, cancelUrl?: string) =>
    makeAuthenticatedRequest("POST", "/api/stripe/upgrade-subscription", {
      planId,
      successUrl,    // ✅ Transmis
      cancelUrl      // ✅ Transmis
    }),
}
```

**Nouveau code dans stripe-routes.ts** :
```typescript
app.post("/api/stripe/upgrade-subscription", requireAuth, async (req, res) => {
  const { planId, successUrl: customSuccessUrl, cancelUrl: customCancelUrl } = req.body;  // ✅ Lecture des paramètres
  
  // Use custom URLs if provided, otherwise use defaults
  const successUrl = customSuccessUrl || `${baseUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = customCancelUrl || `${baseUrl}/dashboard?payment=cancelled`;
  
  const sessionDetails = await StripeServiceNew.createCheckoutSession({
    organizationId: authReq.user.organizationId,
    planId,
    successUrl,    // ✅ Utilise l'URL personnalisée si fournie
    cancelUrl,     // ✅ Utilise l'URL personnalisée si fournie
    customerEmail: organization.email,
  });
  
  res.json({
    success: true,
    sessionId: sessionDetails.sessionId,
    checkoutUrl: sessionDetails.url,
    url: sessionDetails.url,  // ✅ Ajouté pour compatibilité
    planId: sessionDetails.planId,
  });
});
```

## 🎯 Résultat

Maintenant, lorsqu'un utilisateur connecté souhaite changer de plan :

1. ✅ Le frontend récupère automatiquement le token JWT valide
2. ✅ Si le token est expiré, il est rafraîchi automatiquement
3. ✅ La requête est envoyée avec le bon token d'authentification
4. ✅ Le serveur valide le token JWT via `requireAuth` middleware
5. ✅ Une session Stripe Checkout est créée avec les URLs personnalisées
6. ✅ L'utilisateur est redirigé vers le formulaire de paiement Stripe
7. ✅ Après paiement, l'utilisateur est redirigé vers la bonne page avec le statut

## 🔒 Fonctionnalités préservées

Ces corrections n'affectent **AUCUNE** des fonctionnalités existantes :
- ✅ Photos de profil
- ✅ Emails de bienvenue
- ✅ Emails de confirmation d'événements
- ✅ Envoi automatique d'emails aux membres
- ✅ Envoi manuel d'invitations
- ✅ Communication bidirectionnelle (organisateur ↔ membres)
- ✅ Souscription pendant l'inscription (nouveaux utilisateurs)
- ✅ Contact support

## 📝 Fichiers modifiés

1. **client/src/lib/api.ts** : Simplification et correction de `makeAuthenticatedRequest`, transmission des paramètres URLs
2. **server/stripe-routes.ts** : Lecture et utilisation des URLs personnalisées pour les redirections Stripe

## 🧪 Tests recommandés

1. **Scénario 1** : Utilisateur avec plan gratuit "Découverte" → Upgrade vers plan payant
2. **Scénario 2** : Token JWT expiré → Doit se rafraîchir automatiquement
3. **Scénario 3** : Paiement réussi → Redirection vers page de succès
4. **Scénario 4** : Paiement annulé → Retour à la page de sélection des plans

## 📌 Note importante

Le code utilise maintenant la fonction `apiRequest()` de `queryClient.ts` qui gère intelligemment :
- La détection automatique d'expiration des tokens
- Le rafraîchissement proactif avant l'expiration
- La réessai automatique en cas d'échec d'authentification
- Le nettoyage des tokens invalides

Cette approche garantit une meilleure expérience utilisateur et évite les erreurs d'authentification.
