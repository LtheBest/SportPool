import { db } from './db';
import { userPreferences } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface ThemePreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

/**
 * Obtient les préférences d'un utilisateur
 */
export async function getUserPreferences(organizationId: string): Promise<ThemePreferences> {
  try {
    const preferences = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.organizationId, organizationId))
      .limit(1);

    if (preferences[0]) {
      return {
        theme: preferences[0].theme,
        language: preferences[0].language,
        emailNotifications: preferences[0].emailNotifications,
        pushNotifications: preferences[0].pushNotifications,
        marketingEmails: preferences[0].marketingEmails,
      };
    }

    // Créer des préférences par défaut si elles n'existent pas
    const defaultPreferences: ThemePreferences = {
      theme: 'auto',
      language: 'fr',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
    };

    await db.insert(userPreferences).values({
      organizationId,
      ...defaultPreferences,
    });

    return defaultPreferences;
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    // Retourner les préférences par défaut en cas d'erreur
    return {
      theme: 'auto',
      language: 'fr',
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
    };
  }
}

/**
 * Met à jour les préférences d'un utilisateur
 */
export async function updateUserPreferences(organizationId: string, preferences: Partial<ThemePreferences>) {
  try {
    const existingPreferences = await db.select()
      .from(userPreferences)
      .where(eq(userPreferences.organizationId, organizationId))
      .limit(1);

    if (existingPreferences[0]) {
      // Mettre à jour les préférences existantes
      await db.update(userPreferences)
        .set({
          ...preferences,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.organizationId, organizationId));
    } else {
      // Créer de nouvelles préférences
      await db.insert(userPreferences).values({
        organizationId,
        theme: preferences.theme || 'auto',
        language: preferences.language || 'fr',
        emailNotifications: preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
        pushNotifications: preferences.pushNotifications !== undefined ? preferences.pushNotifications : true,
        marketingEmails: preferences.marketingEmails !== undefined ? preferences.marketingEmails : false,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    throw error;
  }
}

/**
 * Réinitialise les préférences aux valeurs par défaut
 */
export async function resetUserPreferences(organizationId: string) {
  try {
    await db.update(userPreferences)
      .set({
        theme: 'auto',
        language: 'fr',
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.organizationId, organizationId));

    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des préférences:', error);
    throw error;
  }
}