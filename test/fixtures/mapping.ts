/**
 * Table-driven conversion cases mirroring `docs/conversion-mapping.md`.
 * Each case asserts the exact Telegram HTML and MarkdownV2 output.
 */
export interface MappingCase {
  name: string;
  md: string;
  html: string;
  mdv2: string;
}

export const inlineCases: MappingCase[] = [
  { name: "bold", md: "**bold**", html: "<b>bold</b>", mdv2: "*bold*" },
  { name: "italic", md: "*italic*", html: "<i>italic</i>", mdv2: "_italic_" },
  // CommonMark parses ***x*** as emphasis(strong(x)).
  { name: "bold+italic", md: "***both***", html: "<i><b>both</b></i>", mdv2: "_*both*_" },
  { name: "strikethrough", md: "~~struck~~", html: "<s>struck</s>", mdv2: "~struck~" },
  { name: "double-underscore is bold", md: "__bold__", html: "<b>bold</b>", mdv2: "*bold*" },
  { name: "inline code", md: "`code`", html: "<code>code</code>", mdv2: "`code`" },
  {
    name: "link",
    md: "[t](https://x)",
    html: '<a href="https://x">t</a>',
    mdv2: "[t](https://x)",
  },
  {
    name: "link with title (title dropped)",
    md: '[t](https://x "ti")',
    html: '<a href="https://x">t</a>',
    mdv2: "[t](https://x)",
  },
  {
    name: "autolink",
    md: "<https://x.com>",
    html: '<a href="https://x.com">https://x.com</a>',
    mdv2: "[https://x\\.com](https://x.com)",
  },
];

export const blockCases: MappingCase[] = [
  { name: "heading → bold", md: "# Heading", html: "<b>Heading</b>", mdv2: "*Heading*" },
  {
    name: "blockquote",
    md: "> quote",
    html: "<blockquote>quote</blockquote>",
    mdv2: ">quote",
  },
  { name: "unordered list", md: "- item", html: "• item", mdv2: "• item" },
  { name: "ordered list", md: "1. item", html: "1. item", mdv2: "1\\. item" },
  { name: "task list (done)", md: "- [x] a", html: "☑ a", mdv2: "☑ a" },
  { name: "task list (open)", md: "- [ ] a", html: "☐ a", mdv2: "☐ a" },
  {
    name: "fenced code with language",
    md: "```js\nx=1\n```",
    html: '<pre><code class="language-javascript">x=1</code></pre>',
    mdv2: "```javascript\nx=1\n```",
  },
  {
    name: "indented code",
    md: "    indented",
    html: "<pre>indented</pre>",
    mdv2: "```\nindented\n```",
  },
  { name: "thematic break", md: "---", html: "──────────", mdv2: "──────────" },
];
