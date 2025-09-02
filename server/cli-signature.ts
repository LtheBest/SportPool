import chalk from 'chalk';

export function displayCLISignature() {
  const signature = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}          ${chalk.bold.blue('🚗 SportPool - Covoiturage Sportif 🏃‍♂️')}          ${chalk.cyan('║')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}                    ${chalk.yellow('by LtheBest')}                           ${chalk.cyan('║')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.green('Une plateforme moderne pour organiser le covoiturage')}   ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.green('lors d\'événements sportifs')}                              ${chalk.cyan('║')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.white('🌟 Fonctionnalités:')}                                   ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Gestion des événements sportifs')}                 ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Organisation du covoiturage intelligent')}         ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Messagerie intégrée')}                            ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Système de rappels automatiques')}               ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Dashboard d\'administration complet')}             ${chalk.cyan('║')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('║')}  ${chalk.magenta('💡 Technologies:')}                                   ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• React + TypeScript')}                            ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Express.js + PostgreSQL')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• Tailwind CSS + Radix UI')}                      ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• JWT Authentication')}                           ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.white('• SendGrid + OpenAI Integration')}               ${chalk.cyan('║')}
${chalk.cyan('║')}                                                              ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}

${chalk.bold.green('🚀 Application démarrée avec succès!')}
${chalk.gray('Version:')} ${chalk.white('2.0.0')} | ${chalk.gray('Environment:')} ${chalk.yellow(process.env.NODE_ENV || 'development')}
${chalk.gray('Créé par:')} ${chalk.bold.blue('LtheBest')} ${chalk.gray('avec')} ${chalk.red('❤️')} ${chalk.gray('pour la communauté sportive')}

${chalk.dim('─'.repeat(80))}
`;

  console.log(signature);
}

export function displayStartupInfo(port: number | string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const baseUrl = process.env.APP_URL || `http://localhost:${port}`;
  
  console.log(chalk.bold.cyan('\n📋 Informations de démarrage:'));
  console.log(chalk.gray('  • Port:'), chalk.white(port));
  console.log(chalk.gray('  • URL:'), chalk.blue.underline(baseUrl));
  console.log(chalk.gray('  • Mode:'), isProduction ? chalk.green('Production') : chalk.yellow('Développement'));
  
  if (!isProduction) {
    console.log(chalk.gray('\n🔧 URLs de développement:'));
    console.log(chalk.gray('  • Application:'), chalk.blue.underline(`${baseUrl}`));
    console.log(chalk.gray('  • API Health:'), chalk.blue.underline(`${baseUrl}/api/health`));
    console.log(chalk.gray('  • Dashboard:'), chalk.blue.underline(`${baseUrl}/dashboard`));
  }
  
  // Informations système
  console.log(chalk.gray('\n💻 Système:'));
  console.log(chalk.gray('  • Node.js:'), chalk.white(process.version));
  console.log(chalk.gray('  • Platform:'), chalk.white(process.platform));
  console.log(chalk.gray('  • Architecture:'), chalk.white(process.arch));
  console.log(chalk.gray('  • Mémoire:'), chalk.white(`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`));
  
  console.log(chalk.dim('\n' + '─'.repeat(80)));
  console.log(chalk.bold.green('✨ SportPool est prêt à accueillir vos événements sportifs!'));
  console.log(chalk.gray('   Organisez, partagez, et partez ensemble! 🚗🏆\n'));
}

export function displayShutdownMessage() {
  console.log(chalk.yellow('\n🛑 Arrêt de SportPool en cours...'));
  console.log(chalk.gray('   Nettoyage des ressources...'));
  
  setTimeout(() => {
    console.log(chalk.green('✅ SportPool s\'est arrêté proprement.'));
    console.log(chalk.cyan('   Merci d\'avoir utilisé SportPool by LtheBest!'));
    console.log(chalk.gray('   À bientôt pour de nouveaux événements! 👋\n'));
  }, 500);
}

export default {
  displayCLISignature,
  displayStartupInfo,
  displayShutdownMessage
};