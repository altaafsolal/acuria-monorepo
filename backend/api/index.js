// Vercel serverless entry point.
//
// tsx is registered as an ESM hook so that TypeScript source files can be
// imported directly at runtime — exactly like local dev with `tsx watch`.
// This avoids compile-step path issues with Vercel's bundler.
//
// vercel.json's `includeFiles: "src/**"` copies all source files into the
// Lambda alongside this file so that fs.readdir + dynamic import in
// loadRoutes.ts can find and load every route module.

import { register } from 'tsx/esm/api';

// Register BEFORE any dynamic TypeScript imports run.
// Static imports above are fine because they only import the `register` symbol.
register();

const { default: app } = await import('../src/app.js');

export default app;
