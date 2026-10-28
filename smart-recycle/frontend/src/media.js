// Optional local media (offline video / custom card photos). Asks the server once
// which files exist, so the browser never requests files that are not there.
let cache = null
export function localMedia() {
  if (!cache) {
    cache = fetch('/api/media').then((r) => (r.ok ? r.json() : { files: [] })).then((j) => new Set(j.files || [])).catch(() => new Set())
  }
  return cache
}
