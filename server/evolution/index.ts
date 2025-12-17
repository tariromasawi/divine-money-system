/**
 * MASOWE Evolution System - Main Export
 * 
 * The self-evolving autonomous system that learns, adapts, and grows.
 */

export {
  initializeEvolutionEngine,
  evolve,
  getEvolutionState,
  executeAction,
  rejectAction,
  activateStrategy,
  getInsights,
  calculateFinancialStrategy,
  detectGrowthOpportunities,
  selfHeal,
} from './engine';

export {
  initializeFinancialCore,
  getFinancialState,
  recalculate as recalculateFinancials,
  calculateOptimalPrice,
  monteCarloForecast,
  generateTradingSignals,
} from './financial-core';

/**
 * Initialize the complete evolution system
 */
export async function initializeEvolutionSystem(): Promise<void> {
  const { initializeEvolutionEngine } = await import('./engine');
  const { initializeFinancialCore } = await import('./financial-core');
  
  console.log('[Evolution System] Initializing autonomous capabilities...');
  
  await initializeEvolutionEngine();
  await initializeFinancialCore();
  
  console.log('[Evolution System] ✓ Self-evolution engine online');
  console.log('[Evolution System] ✓ Financial intelligence core online');
  console.log('[Evolution System] ✓ All autonomous systems operational');
}
