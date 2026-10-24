/**
 * Firestore security rules tests. They run against the Firebase emulator (needs Java):
 *   npm run test:rules
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { arrayRemove, arrayUnion, deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;
const gur = () => env.authenticatedContext('gur').firestore();
const dana = () => env.authenticatedContext('dana').firestore();
const stranger = () => env.authenticatedContext('stranger').firestore();
const DAY = 86_400_000;
const vacation = (uid: string, extra: Record<string, unknown> = {}) => ({ json: '{}', version: 1, members: [uid], names: { [uid]: 'Me' }, updatedBy: 'Me', updatedAt: serverTimestamp(), ...extra });
const invite = (uid: string, extra: Record<string, unknown> = {}) => ({
  vacationName: 'January', winterYear: 2027, fromName: 'Gur', createdBy: uid, createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 14 * DAY), ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-somegoodski', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'vacations/v1'), { json: '{}', version: 3, members: ['gur'], names: { gur: 'Gur' }, updatedBy: 'Gur', updatedAt: Timestamp.now() });
    await setDoc(doc(db, 'vacations/v1/invites/good'), { vacationName: 'January', winterYear: 2027, fromName: 'Gur', createdBy: 'gur', createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + DAY) });
    await setDoc(doc(db, 'vacations/v1/invites/old'), { vacationName: 'January', winterYear: 2027, fromName: 'Gur', createdBy: 'gur', createdAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() - DAY) });
  });
});

describe('reading', () => {
  it('only members can read', async () => {
    await assertSucceeds(getDoc(doc(gur(), 'vacations/v1')));
    await assertFails(getDoc(doc(stranger(), 'vacations/v1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'vacations/v1')));
  });
});

describe('creating', () => {
  it('allows a normal shared vacation', async () => {
    await assertSucceeds(setDoc(doc(dana(), 'vacations/v2'), vacation('dana')));
  });
  it('rejects other members, versions, extra fields and oversized data', async () => {
    await assertFails(setDoc(doc(dana(), 'vacations/v3'), vacation('dana', { members: ['dana', 'gur'] })));
    await assertFails(setDoc(doc(dana(), 'vacations/v4'), vacation('dana', { version: 5 })));
    await assertFails(setDoc(doc(dana(), 'vacations/v5'), vacation('dana', { stash: 'files' })));
    await assertFails(setDoc(doc(dana(), 'vacations/v6'), vacation('dana', { json: 'x'.repeat(300_001) })));
    await assertFails(setDoc(doc(dana(), 'vacations/v7'), vacation('dana', { names: { dana: 'D', gur: 'G' } })));
    await assertFails(setDoc(doc(dana(), 'vacations/v8'), vacation('dana', { updatedAt: Timestamp.fromMillis(0) })));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'vacations/v9'), vacation('nobody')));
  });
});

describe('saving', () => {
  const save = (extra: Record<string, unknown> = {}) => ({ json: '{"a":1}', version: 4, updatedBy: 'Gur', updatedAt: serverTimestamp(), ...extra });
  it('a member saves on top of the latest version', async () => {
    await assertSucceeds(updateDoc(doc(gur(), 'vacations/v1'), save({ 'names.gur': 'Gur S' })));
  });
  it('rejects stale or skipped versions, outsiders, extra fields, big data and other names', async () => {
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ version: 3 })));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ version: 9 })));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), save()));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ stash: 'x' })));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ json: 'x'.repeat(300_001) })));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ 'names.dana': 'Fake' })));
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), save({ members: ['gur', 'stranger'] })));
  });
});

describe('membership', () => {
  it('joining needs a live invite and adds only yourself', async () => {
    await assertSucceeds(updateDoc(doc(dana(), 'vacations/v1'), { members: arrayUnion('dana'), 'names.dana': 'Dana', joinCode: 'good' }));
    await assertSucceeds(getDoc(doc(dana(), 'vacations/v1')));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'old' }));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'nope' }));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger', 'x'), joinCode: 'good' }));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'good', json: 'hacked' }));
    await assertFails(updateDoc(doc(stranger(), 'vacations/v1'), { members: arrayUnion('stranger'), joinCode: 'good', 'names.gur': 'Hacked' }));
  });
  it('members can remove others but not add them directly', async () => {
    await updateDoc(doc(dana(), 'vacations/v1'), { members: arrayUnion('dana'), 'names.dana': 'Dana', joinCode: 'good' });
    await assertFails(updateDoc(doc(gur(), 'vacations/v1'), { members: arrayUnion('stranger') }));
    await assertSucceeds(updateDoc(doc(gur(), 'vacations/v1'), { members: arrayRemove('dana') }));
  });
  it('members can delete the vacation, others cannot', async () => {
    await assertFails(deleteDoc(doc(stranger(), 'vacations/v1')));
    await assertSucceeds(deleteDoc(doc(gur(), 'vacations/v1')));
  });
});

describe('invites', () => {
  it('readable with the code, created by members within 30 days', async () => {
    await assertSucceeds(getDoc(doc(stranger(), 'vacations/v1/invites/good')));
    await assertSucceeds(setDoc(doc(gur(), 'vacations/v1/invites/new1'), invite('gur')));
    await assertFails(setDoc(doc(gur(), 'vacations/v1/invites/new2'), invite('gur', { expiresAt: Timestamp.fromMillis(Date.now() + 60 * DAY) })));
    await assertFails(setDoc(doc(gur(), 'vacations/v1/invites/new3'), invite('gur', { blob: 'x'.repeat(1000) })));
    await assertFails(setDoc(doc(gur(), 'vacations/v1/invites/new4'), invite('gur', { vacationName: 'x'.repeat(500) })));
    await assertFails(setDoc(doc(gur(), 'vacations/v1/invites/new5'), invite('stranger')));
    await assertFails(setDoc(doc(stranger(), 'vacations/v1/invites/mine'), invite('stranger')));
    await assertSucceeds(deleteDoc(doc(gur(), 'vacations/v1/invites/good')));
  });
});
