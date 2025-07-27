import { describe, it, expect } from 'vitest';

import { add, greet } from '../utils';

describe('playground utils', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });

    it('should add negative numbers', () => {
      expect(add(-1, -2)).toBe(-3);
    });

    it('should add zero', () => {
      expect(add(5, 0)).toBe(5);
    });
  });

  describe('greet', () => {
    it('should greet a person by name', () => {
      expect(greet('Alice')).toBe('Hello, Alice!');
    });

    it('should handle empty string', () => {
      expect(greet('')).toBe('Hello, !');
    });
  });
});
