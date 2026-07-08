// Vercel serverless entry point for the backend.
// `npm run build` compiles TypeScript to dist/ before this file is deployed.
// vercel.json includes the entire dist/ tree alongside this function so that
// loadRoutes() can discover route files via fs.readdir at runtime.
export { default } from '../dist/src/app.js';
