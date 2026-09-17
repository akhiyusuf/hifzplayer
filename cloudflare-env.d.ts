interface CloudflareEnv {
  DIRAS_FILES?: {
    get(key: string): Promise<{ body: ReadableStream | null } | null>;
    put(
      key: string,
      value: string | ArrayBuffer | ReadableStream | Blob,
      options?: { httpMetadata?: { contentType?: string } },
    ): Promise<unknown>;
  };
  NEXT_INC_CACHE_R2_BUCKET?: CloudflareEnv["DIRAS_FILES"];
  ASSETS?: unknown;
  WORKER_SELF_REFERENCE?: unknown;
}
