import { describe, test, expect } from 'bun:test';
import {
  MAX_IMAGES, defaultPose, heightFrac, clampPose, acceptCount, nextId,
  createMemoryStore,
} from '../src/altar.js';

describe('defaultPose', () => {
  test('deterministic, six columns, tilts in a gentle range', () => {
    expect(defaultPose(0)).toEqual(defaultPose(0));
    const poses = Array.from({ length: 30 }, (_, i) => defaultPose(i));
    for (const p of poses) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(1.05); // slight overlap is fine
      expect(Math.abs(p.tilt)).toBeLessThanOrEqual(4);
      expect(p.bottom).toBeGreaterThanOrEqual(0.6);
    }
    expect(new Set(poses.map((p) => p.x)).size).toBe(6);
  });
});

describe('clampPose', () => {
  const scene = 16 / 9; // wide scene
  test('clamps width, keeps bottom in the table band', () => {
    const c = clampPose({ x: -0.5, w: 9, tilt: 2, bottom: 5 }, scene, 1);
    expect(c.x).toBe(0);
    expect(c.w).toBeLessThanOrEqual(0.38);
    expect(c.bottom).toBeLessThanOrEqual(0.99);
    expect(c.bottom).toBeGreaterThanOrEqual(0.6);
  });
  test('a very tall image is shrunk to stand, not clipped', () => {
    const c = clampPose({ x: 0.4, w: 0.38, tilt: 0, bottom: 0.9 }, scene, 0.4);
    expect(heightFrac(c.w, scene, 0.4)).toBeLessThanOrEqual(0.92);
    expect(c.bottom - heightFrac(c.w, scene, 0.4)).toBeGreaterThanOrEqual(0.02);
  });
  test('a sane pose passes through untouched', () => {
    const p = { x: 0.2, w: 0.2, tilt: -2, bottom: 0.9 };
    expect(clampPose(p, scene, 1.5)).toEqual(p);
  });
});

describe('acceptCount', () => {
  test('limit is 30, partial acceptance allowed', () => {
    expect(MAX_IMAGES).toBe(30);
    expect(acceptCount(0, 5)).toBe(5);
    expect(acceptCount(28, 5)).toBe(2);
    expect(acceptCount(30, 5)).toBe(0);
    expect(acceptCount(0, 0)).toBe(0);
  });
});

describe('nextId', () => {
  test('unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => nextId()));
    expect(ids.size).toBe(100);
  });
});

describe('memory store', () => {
  test('save/load/remove/clear round-trip', async () => {
    const s = createMemoryStore();
    expect(await s.load()).toEqual([]);
    await s.save({ id: 'a', x: 0.1 });
    await s.save({ id: 'b', x: 0.2 });
    expect((await s.load()).map((i) => i.id).sort()).toEqual(['a', 'b']);
    await s.remove('a');
    expect((await s.load()).map((i) => i.id)).toEqual(['b']);
    await s.clear();
    expect(await s.load()).toEqual([]);
  });
});
