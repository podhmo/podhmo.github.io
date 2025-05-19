import { parseMarkdownToHierarchicalTemplates } from "./parse.ts";

for (const file of Deno.args) {
  const markdown = await Deno.readTextFile(file);
  const result = parseMarkdownToHierarchicalTemplates(markdown);
  console.log(JSON.stringify(result, null, 2));
}