/**
 * Firestore security rules tests. They run against the Firebase emulator (needs Java):
 *   npm run test:rules
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayUnion, deleteDoc, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const gur = () => env.authenticatedContext('gur').firestore();
const dana = () => env.authenticatedContext('dana').firestore();
const stranger = () => env.authenticatedContext('stranger').firestore();
const DAY = 86_400_000;

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-somegoodski', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'vacations/v1'), { json: '{}', version: 3, members: ['gur'], names: { gur: 'Gur' }, updatedBy: 'Gur' });
    await setDoc(doc(db, 'vacations/v1/invites/good'), { vacationName: 'January', winterYear: 2027, fromName: 'Gur', createdBy: 'gur', expiresAt: Timestamp.fromMillis(Date.now() + DAY) });
    await setDoc(doc(db, 'vacations/v1/invites/old'), { vacationName: 'January', winterYear: 2027, fromName: 'Gur', createdBy: 'gur', expiresAt: Timestamp.fromMillis(Date.now() - DAY) });
  });
});

describe('shared vacations', () => {
  it('only members can read', async () => {
    await assertSucceeds(getDoc(doc(gur(), 'vacations/v1')));
    await assertFails(getDoc(doc(stranger(), 'vacations/v1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'vacations/v1')));
  });

  it('creating requires being the only member at version 1', async () => {
    await assertSucceeds(setDoc(doc(dana(), 'vacations/v2'), { json: '{}', version: 1, members: ['dana'], names: { dana: 'Dana' } }));
    await assertFails(setDoc(doc(dana(), 'vacations/v3'), { json: '{}', version: 1, members: ['dana', 'gur'], names: {} }));
    await assertFails(setDoc(doc(dana(), 'vacations/v4'), { json: '{}', version: 5, members: ['dana'], names: {} }));
  });

  it('a member saves only on top of the latest version', async () => {
    await assertSucceeds(updateDoc(doc(gur(), 'vacations/v1'), { json: '{"a":1}', version: 4 }));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), { json: '{"a":2}', version: 4 })); // stale: already 4
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { json: '{}', version: 5 }));
  });

  it('joining needs a live invite and adds only yourself', async () => {
    await assertSucceeds(updateDoc(doc(dana(), 'vacations/v1'), { members: arrayUnion('dana'), 'names.dana': 'Dana', joinCode: 'good' }));
    await assertSucceeds(getDoc(doc(dana(), 'vacations/v1')));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'old' })); // expired
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'nope' })); // no such invite
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger', 'x'), joinCode: 'good' })); // more than yourself
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'good', json: 'hacked' })); // touches data
  });

  it('invites: readable with the code, managed by members', async () => {
    await assertSucceeds(getDoc(doc(stranger(), 'vacations/v1/invites/good')));
    await assertFails(setDoc(doc(stranger(), 'vacations/v1/invites/mine'), { expiresAt: Timestamp.fromMillis(Date.now() + DAY) }));
    await assertSucceeds(deleteDoc(doc(gur(), 'vacations/v1/invites/good')));
  });

  it('members can delete the vacation, others cannot', async () => {
    await assertFails(deleteDoc(doc(stranger(), 'vacations/v1')));
    await assertSucceeds(deleteDoc(doc(gur(), 'vacations/v1')));
  });
});
