export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // Nouvelle fonctionnalité
        'fix',      // Correction de bug
        'docs',     // Documentation seulement
        'style',    // Changements qui n'affectent pas le sens du code
        'refactor', // Refactorisation qui ne corrige pas un bug et n'ajoute pas de fonctionnalité
        'perf',     // Changement qui améliore les performances
        'test',     // Ajout de tests manquants ou correction de tests existants
        'build',    // Changements qui affectent le système de build
        'ci',       // Changements aux fichiers et scripts d'intégration continue
        'chore',    // Autres changements qui ne modifient pas les fichiers src ou de test
        'revert',   // Revient à un commit précédent
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [2, 'always', 'lower-case'],
    'header-max-length': [2, 'always', 100],
  },
};