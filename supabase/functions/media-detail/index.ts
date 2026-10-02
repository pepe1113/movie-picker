import { handleMediaDetailRequest } from './handler.ts'

Deno.serve((req) =>
  handleMediaDetailRequest(req, {
    tmdbToken: Deno.env.get('TMDB_ACCESS_TOKEN'),
    omdbKey: Deno.env.get('OMDB_API_KEY'),
  }),
)
