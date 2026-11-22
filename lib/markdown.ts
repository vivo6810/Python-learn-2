import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import plaintext from "highlight.js/lib/languages/plaintext";

hljs.registerLanguage("python", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("plaintext", plaintext);

marked.setOptions({ gfm: true, breaks: false });

const CODE_BLOCK = /<pre><code(?: class="language-([\w-]+)")?>([\s\S]*?)<\/code><\/pre>/g;

function decode(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function highlight(code: string, language: string): string {
  if (!hljs.getLanguage(language)) return hljs.highlight(code, { language: "plaintext" }).value;
  return hljs.highlight(code, { language }).value;
}

/** Renders lesson markdown once, for every page that shows a lesson. */
export function renderMarkdown(source: string): string {
  const html = marked.parse(source) as string;

  return html.replace(CODE_BLOCK, (_match, rawLanguage: string | undefined, encoded: string) => {
    const language = rawLanguage ?? "python";
    const code = decode(encoded);
    const label = language === "plaintext" ? "output" : language;
    const highlighted = highlight(code, language);

    if (language === "python") {
      // The raw source rides along base64-encoded so RunnableExamples can swap the
      // static figure for a live, editable environment on the client. Without JS the
      // highlighted figure still renders.
      const b64 = Buffer.from(code, "utf8").toString("base64");
      return [
        `<figure class="code code--runnable" data-language="${label}" data-code-b64="${b64}">`,
        `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`,
        `</figure>`,
      ].join("");
    }

    return [
      `<figure class="code" data-language="${label}">`,
      `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`,
      `</figure>`,
    ].join("");
  });
}
