declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STOCKROOM_READ_ONLY?: string;
  }
}
