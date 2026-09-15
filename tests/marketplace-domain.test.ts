import assert from 'node:assert/strict';
import test from 'node:test';
import {assertBookingTransition, canTransitionBooking} from '../lib/marketplace/booking-state.ts';
import {DEFAULT_MATCHING_WEIGHTS, rankCandidates, validateMatchingWeights, type MatchCandidate} from '../lib/marketplace/matching.ts';

const candidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: 'pujari-a', active: true, verified: true, sameRealm: true, offersService: true,
  available: true, supportsMode: true, servesLocation: true, languageMatch: true,
  specializationMatch: true, rating: 4, completionRate: 0.8, acceptanceRate: 0.8,
  previousRelationship: false, ...overrides,
});

test('default matching weights total 100', () => {
  assert.doesNotThrow(() => validateMatchingWeights(DEFAULT_MATCHING_WEIGHTS));
});

test('availability and verification are mandatory eligibility gates', () => {
  const ranked = rankCandidates([candidate(), candidate({id: 'unavailable', available: false}), candidate({id: 'pending', verified: false})]);
  assert.deepEqual(ranked.map((entry) => entry.candidateId), ['pujari-a']);
});

test('relationship and quality factors rank stronger candidates first', () => {
  const ranked = rankCandidates([
    candidate({id: 'new', rating: 3, completionRate: 0.6, acceptanceRate: 0.6}),
    candidate({id: 'repeat', rating: 5, completionRate: 1, acceptanceRate: 1, previousRelationship: true}),
  ]);
  assert.equal(ranked[0].candidateId, 'repeat');
  assert.equal(ranked[0].score, 100);
  assert.equal(ranked[0].factors.find((factor) => factor.key === 'previousRelationship')?.points, 5);
});

test('candidate ties have deterministic ordering', () => {
  assert.deepEqual(rankCandidates([candidate({id: 'b'}), candidate({id: 'a'})]).map((item) => item.candidateId), ['a', 'b']);
});

test('invalid weight configuration fails closed', () => {
  assert.throws(() => validateMatchingWeights({...DEFAULT_MATCHING_WEIGHTS, service: 29}), /total 100/);
});

test('normal booking transitions are explicit', () => {
  assert.equal(canTransitionBooking('REQUESTED', 'AWAITING_CONFIRMATION'), true);
  assert.equal(canTransitionBooking('COMPLETED', 'IN_PROGRESS'), false);
  assert.throws(() => assertBookingTransition('COMPLETED', 'IN_PROGRESS'), /Invalid booking transition/);
});

test('admin overrides require a non-empty reason', () => {
  assert.throws(() => assertBookingTransition('REFUNDED', 'CONFIRMED', '  '));
  assert.doesNotThrow(() => assertBookingTransition('REFUNDED', 'CONFIRMED', 'Payment dispute resolved by founder'));
});
