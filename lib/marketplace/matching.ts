export type MatchingWeights = {
  service: number;
  geography: number;
  language: number;
  specialization: number;
  rating: number;
  completionRate: number;
  acceptanceRate: number;
  previousRelationship: number;
};

export const DEFAULT_MATCHING_WEIGHTS: Readonly<MatchingWeights> = Object.freeze({
  service: 30,
  geography: 20,
  language: 15,
  specialization: 10,
  rating: 10,
  completionRate: 5,
  acceptanceRate: 5,
  previousRelationship: 5,
});

export type MatchCandidate = {
  id: string;
  active: boolean;
  verified: boolean;
  sameRealm: boolean;
  offersService: boolean;
  available: boolean;
  supportsMode: boolean;
  servesLocation: boolean;
  languageMatch: boolean;
  specializationMatch: boolean;
  rating: number | null;
  completionRate: number | null;
  acceptanceRate: number | null;
  previousRelationship: boolean;
};

export type MatchFactor = {key: keyof MatchingWeights; label: string; points: number; maximum: number};
export type RankedCandidate = {candidateId: string; score: number; factors: MatchFactor[]};

function bounded(value: number | null, fallback = 0): number {
  if (value === null || !Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function validateMatchingWeights(weights: MatchingWeights): void {
  const values = Object.values(weights);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error('Matching weights must be non-negative integers');
  }
  if (values.reduce((sum, value) => sum + value, 0) !== 100) {
    throw new Error('Matching weights must total 100');
  }
}

export function isEligibleCandidate(candidate: MatchCandidate): boolean {
  return candidate.active && candidate.verified && candidate.sameRealm && candidate.offersService &&
    candidate.available && candidate.supportsMode && candidate.servesLocation;
}

export function rankCandidates(
  candidates: readonly MatchCandidate[],
  weights: MatchingWeights = DEFAULT_MATCHING_WEIGHTS,
): RankedCandidate[] {
  validateMatchingWeights(weights);

  return candidates.filter(isEligibleCandidate).map((candidate) => {
    const factorValues: Array<[keyof MatchingWeights, string, number]> = [
      ['service', 'Service match', 1],
      ['geography', 'Location', 1],
      ['language', 'Language', candidate.languageMatch ? 1 : 0],
      ['specialization', 'Specialization', candidate.specializationMatch ? 1 : 0],
      ['rating', 'Rating', candidate.rating === null ? 0.5 : bounded(candidate.rating / 5)],
      ['completionRate', 'Completion rate', bounded(candidate.completionRate, 0.5)],
      ['acceptanceRate', 'Acceptance rate', bounded(candidate.acceptanceRate, 0.5)],
      ['previousRelationship', 'Previous relationship', candidate.previousRelationship ? 1 : 0],
    ];
    const factors = factorValues.map(([key, label, value]) => ({
      key,
      label,
      maximum: weights[key],
      points: Math.round(weights[key] * value * 100) / 100,
    }));
    return {
      candidateId: candidate.id,
      score: Math.round(factors.reduce((sum, factor) => sum + factor.points, 0) * 100) / 100,
      factors,
    };
  }).sort((left, right) => right.score - left.score || left.candidateId.localeCompare(right.candidateId));
}
