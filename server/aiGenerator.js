// The listing generator lives in src/lib/aiGenerator.js so the browser
// preview can call it directly without a running server. This wrapper
// re-exports it so the Express endpoint in server/index.js stays a real,
// working API for the GitHub repo.
export { generateListing } from '../src/lib/aiGenerator.js'
