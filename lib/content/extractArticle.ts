import "server-only";

import { load } from "cheerio";

export const MAX_ARTICLE_CHARACTERS = 10_000;
export const MIN_ARTICLE_CHARACTERS = 300;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Extracts readable article blocks from the target site's semantic article element. */
export function extractArticleText(html: string): string {
  const $ = load(html);
  const article = $("article").first();
  const pagefindBody = $("[data-pagefind-body]").first();
  const content = article.length > 0 ? article : pagefindBody.length > 0 ? pagefindBody : $("main").first();

  content.find("script, style, nav, footer, noscript, svg, form, button, iframe").remove();

  const blocks: string[] = [];
  content.find("h1, h2, h3, h4, h5, h6, p, li, blockquote").each((_, element) => {
    const tag = element.tagName.toLowerCase();
    const block = $(element);

    if ((tag === "p" || tag === "blockquote") && block.parents("li").length > 0) return;
    if (tag === "li" && block.parents("li").length > 0) return;

    const text = normalizeWhitespace(block.text());
    if (!text || blocks.at(-1) === text) return;

    if (/^h[1-6]$/.test(tag)) {
      blocks.push(`${"#".repeat(Number(tag[1]))} ${text}`);
    } else if (tag === "li") {
      blocks.push(`- ${text}`);
    } else if (tag === "blockquote") {
      blocks.push(`> ${text}`);
    } else {
      blocks.push(text);
    }
  });

  const text = blocks.join("\n\n");
  return text.length > MAX_ARTICLE_CHARACTERS ? text.slice(0, MAX_ARTICLE_CHARACTERS).trimEnd() : text;
}
