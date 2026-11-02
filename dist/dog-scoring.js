import { QUESTIONS, PROFILES, ARCHETYPES } from './dog-data.js';

const groups = [...new Set(QUESTIONS.map(question => question.group))];
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export function calculateResults(answers) {
  const domain = {};
  for (const group of groups) {
    const items = QUESTIONS.filter(question => question.group === group);
    const observed = items.map(question => answers[question.id]).filter(value => Number.isInteger(value) && value >= 0 && value <= 4);
    domain[group] = observed.length >= Math.ceil(items.length * 0.6) ? mean(observed) : null;
  }
  const fears = [domain.HF, domain.DF, domain.NF].filter(value => value !== null);
  const fear = fears.length >= 2 ? mean(fears) : null;
  const calm = domain.R !== null && domain.T !== null ? mean([domain.R, domain.T]) : null;
  const vector = [domain.E, domain.A, domain.S, fear, domain.P, domain.DA, domain.HA, calm];
  const available = vector.filter(value => value !== null).length;
  const archetypeVector = [domain.E, domain.A, domain.S, domain.HF, domain.DF, domain.NF, domain.P, domain.DA, domain.HA, domain.R, domain.T];
  const archetypeAvailable = archetypeVector.filter(value => value !== null).length;
  const enough = available >= 6 && archetypeAvailable >= 8 && fears.length >= 2 && (domain.DA !== null || domain.HA !== null);
  const compare = (profiles, observedVector) => profiles.map(profile => {
    if (!enough) return { profile, score: null, distance: null };
    let sum = 0, count = 0;
    observedVector.forEach((value, index) => { if (value !== null) { sum += (value - profile.center[index]) ** 2; count += 1; } });
    const distance = Math.sqrt(sum / count);
    return { profile, distance, score: Math.round(100 * (1 - Math.min(distance, 4) / 4)) };
  }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const matches = compare(PROFILES, vector);
  const archetypeMatches = compare(ARCHETYPES, archetypeVector);
  return { domain, vector, available, archetypeVector, archetypeAvailable, enough, matches, archetypeMatches };
}

