declare global {
  // OpenNext reads this global while Wrangler generates Cloudflare.Env.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CloudflareEnv extends Cloudflare.Env {}
}

export {};
