# Use Cloudflare-native Next.js deployment

The application uses Next.js through OpenNext on Cloudflare Workers, with D1 for relational data, R2 for versioned logos, and Cloudflare Access for authentication. This keeps compute and storage within the requested hosting platform and uses bindings rather than runtime REST calls.
