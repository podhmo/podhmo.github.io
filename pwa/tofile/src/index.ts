// Static assets are served by Wrangler from the public/ directory.
// This Worker has no additional logic.
export default {
  async fetch(): Promise<Response> {
    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler;

