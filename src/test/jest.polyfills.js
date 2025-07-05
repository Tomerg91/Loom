// jest.polyfills.js
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream } from 'web-streams-polyfill';

// Polyfill for TextEncoder/TextDecoder
Object.assign(global, { TextDecoder, TextEncoder });

// Polyfill for ReadableStream
Object.assign(global, { ReadableStream });

// Polyfill for fetch
import { fetch, Headers, Request, Response } from 'undici';
Object.assign(global, { fetch, Headers, Request, Response });

// Polyfill for structuredClone
import { structuredClone } from '@ungap/structured-clone';
Object.assign(global, { structuredClone });

// Mock for crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});