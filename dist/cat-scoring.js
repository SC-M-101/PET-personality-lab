import { QUESTIONS, ARCHETYPES } from './cat-data.js';

const GROUPS = [...new Set(QUESTIONS.map(question => question.group))];
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export const RESEARCH_FACTORS = [
  { key: 'fear', name: '害怕与谨慎', detail: '陌生人、新事物及猫际情境' },
  { key: 'play', name: '活动与玩耍', detail: '主动玩耍和日常活动' },
  { key: 'humanConflict', name: '对人冲突反应', detail: '特定情境下的威胁动作' },
  { key: 'humanSocial', name: '亲人程度', detail: '主动靠近与互动' },
  { key: 'catSocial', name: '亲猫程度', detail: '与熟悉的猫相处' },
];

export function calculateResults(answers) {
  const domain = {};
  for (const group of GROUPS) {
    const items = QUESTIONS.filter(question => question.group === group);
    const observed = items.map(question => answers[question.id]).filter(value => Number.isInteger(value) && value >= 0 && value <= 4);
    domain[group] = observed.length >= Math.ceil(items.length * 0.6) ? mean(observed) : null;
  }

  const available = Object.values(domain).filter(value => value !== null).length;
  const eligible = ARCHETYPES.filter(profile => profile.requires.every(group => domain[group] !== null));
  const enough = available >= 9 && eligible.length >= 2;
  const archetypeMatches = enough ? eligible.map(profile => {
    let sum = 0;
    let weightSum = 0;
    for (const [group, value] of Object.entries(domain)) {
      if (value === null) continue;
      const weight = profile.requires.includes(group) ? 1.5 : 1;
      sum += weight * (value - profile.center[group]) ** 2;
      weightSum += weight;
    }
    const distance = Math.sqrt(sum / weightSum);
    return { profile, distance, score: Math.round(100 * (1 - Math.min(distance, 4) / 4)) };
  }).sort((a, b) => a.distance - b.distance || a.profile.id - b.profile.id) : [];

  const fearValues = [domain.FH, domain.FN, domain.CF].filter(value => value !== null);
  const fear = fearValues.length >= 2 ? mean(fearValues) : null;
  const rawFactors = { fear, play: domain.P, humanConflict: domain.HA, humanSocial: domain.H, catSocial: domain.C };
  const researchScores = RESEARCH_FACTORS.map(factor => ({ ...factor, value: rawFactors[factor.key], score: rawFactors[factor.key] === null ? null : Math.round(rawFactors[factor.key] * 25) }));

  return { domain, available, enough, archetypeMatches, researchScores };
}

