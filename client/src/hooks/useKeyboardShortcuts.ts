import { useEffect } from 'react';
import { useLocation } from 'wouter';

interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(actions: ShortcutAction[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of actions) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = !shortcut.ctrlKey || event.ctrlKey;
        const altMatch = !shortcut.altKey || event.altKey;
        const shiftMatch = !shortcut.shiftKey || event.shiftKey;
        const metaMatch = !shortcut.metaKey || event.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          // Only trigger if all conditions match exactly
          if (
            (shortcut.ctrlKey === event.ctrlKey || shortcut.ctrlKey === undefined) &&
            (shortcut.altKey === event.altKey || shortcut.altKey === undefined) &&
            (shortcut.shiftKey === event.shiftKey || shortcut.shiftKey === undefined) &&
            (shortcut.metaKey === event.metaKey || shortcut.metaKey === undefined)
          ) {
            event.preventDefault();
            shortcut.action();
            break;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}

export function useCommonShortcuts() {
  const [, setLocation] = useLocation();

  const shortcuts: ShortcutAction[] = [
    {
      key: 'h',
      altKey: true,
      action: () => setLocation('/'),
      description: 'Alt+H - Aller à l\'accueil'
    },
    {
      key: 'd',
      altKey: true,
      action: () => setLocation('/dashboard'),
      description: 'Alt+D - Aller au dashboard'
    },
    {
      key: 'm',
      altKey: true,
      action: () => setLocation('/dashboard?section=messages'),
      description: 'Alt+M - Aller aux messages'
    },
    {
      key: 'e',
      altKey: true,
      action: () => setLocation('/dashboard?section=events'),
      description: 'Alt+E - Aller aux événements'
    },
    {
      key: 'p',
      altKey: true,
      action: () => setLocation('/dashboard?section=profile'),
      description: 'Alt+P - Aller au profil'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => {
        // This would open create event modal - for now just go to events
        setLocation('/dashboard?section=events');
        // TODO: Trigger create event modal
      },
      description: 'Ctrl+N - Créer un nouvel événement'
    },
    {
      key: '/',
      action: () => {
        // Focus search input if available
        const searchInput = document.querySelector('input[placeholder*="recherch"], input[placeholder*="Recherch"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: '/ - Rechercher'
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals, blur active elements
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Close any open dropdowns or modals
        const openDropdowns = document.querySelectorAll('[data-state="open"]');
        openDropdowns.forEach((dropdown) => {
          const closeButton = dropdown.querySelector('[aria-label*="Close"], [aria-label*="Fermer"], button[title*="Close"], button[title*="Fermer"]');
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        });
      },
      description: 'Échap - Fermer les modales/dropdowns'
    },
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // Show keyboard shortcuts help
        showShortcutsHelp();
      },
      description: '? - Afficher l\'aide des raccourcis'
    }
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

function showShortcutsHelp() {
  // Create and show shortcuts modal
  const existingModal = document.getElementById('shortcuts-help-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'shortcuts-help-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-gray-900">Raccourcis clavier</h2>
        <button id="close-shortcuts-modal" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
      
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Accueil</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Alt + H</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Dashboard</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Alt + D</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Messages</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Alt + M</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Événements</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Alt + E</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Profil</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Alt + P</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Nouvel événement</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Ctrl + N</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Rechercher</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">/</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Fermer modales</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">Échap</kbd>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Aide raccourcis</span>
          <kbd class="px-2 py-1 bg-gray-100 border rounded text-sm">?</kbd>
        </div>
      </div>
      
      <div class="mt-6 p-3 bg-blue-50 rounded-lg">
        <p class="text-sm text-blue-700">
          <i class="fas fa-info-circle mr-2"></i>
          Utilisez ces raccourcis pour naviguer plus rapidement dans l'application.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal handlers
  const closeModal = () => modal.remove();
  document.getElementById('close-shortcuts-modal')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // ESC key to close
  const escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}