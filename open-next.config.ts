import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/** R2 incremental cache is optional — enable NEXT_INC_CACHE_R2_BUCKET in wrangler.jsonc first. */
export default defineCloudflareConfig();
