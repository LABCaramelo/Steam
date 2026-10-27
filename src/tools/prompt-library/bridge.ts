export interface PromptRequest { type: "lab:prompts:request"; id: string; slug: string | null }

export function isPromptRequest(value: unknown): value is PromptRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<PromptRequest>;
  return request.type === "lab:prompts:request" && typeof request.id === "string"
    && /^[a-zA-Z0-9-]{1,80}$/.test(request.id)
    && (request.slug === null || (typeof request.slug === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(request.slug)));
}

/** The document receives account-scoped preferences and its URL, never credentials. */
export function buildPromptDocument(source: string, pageUrl: string, userId: string): string {
  const page = new URL(pageUrl);
  const base = `${page.origin}/tools/prompt-library/`;
  const attribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const bootstrap = `<base href="${attribute(base)}"><meta name="lab-account" content="${attribute(userId)}"><meta name="lab-page-url" content="${attribute(page.href)}">`
    + (page.searchParams.get("embed") === "1" ? "<script>document.documentElement.dataset.embedded='true'</script>" : "");
  return source.replace("<head>", `<head>${bootstrap}`)
    .replace('src="./assets/js/prompt-library-controls.js"', 'src="./assets/js/prompt-library-controls.js?v=lab-controls-4"')
    .replace('src="./assets/js/prompt-library.js"', 'src="./assets/js/prompt-library.js?v=lab-auth-1"');
}
