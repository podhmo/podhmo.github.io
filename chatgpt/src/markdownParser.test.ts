import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseMarkdown } from "./markdownParser.js";

// JSDocの型定義を元にテスト用の型を定義 (実際のアサーションは構造で行います)
/**
 * @typedef {object} ParsedPrompt
 * @property {string} language
 * @property {string} body
 */

/**
 * @typedef {object} ParsedTemplate
 * @property {string} templateName
 * @property {string} description
 * @property {ParsedPrompt[]} prompts
 * @property {string} categoryName
 */

/**
 * @typedef {object} ParsedCategory
 * @property {string} categoryName
 * @property {string} description
 * @property {ParsedTemplate[]} templates
 */

Deno.test("Markdown Parser: Core Functionality", async (t) => {

    await t.step("should return empty array for empty markdown", () => {
        const md = "";
        const result = parseMarkdown(md);
        assertEquals(result, []);
    });

    await t.step("should parse a single category with only a name", () => {
        const md = "# Category 1";
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        assertEquals(result[0].categoryName, "Category 1");
        assertEquals(result[0].description, "");
        assertEquals(result[0].templates, []);
    });

    await t.step("should parse a single category with description", () => {
        const md = `
# Category 1
Description for category 1.
Line 2.
        `;
        const expectedDescription = "Description for category 1.\nLine 2.";
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        assertEquals(result[0].categoryName, "Category 1");
        assertEquals(result[0].description, expectedDescription); // Parser trims final description
        assertEquals(result[0].templates, []);
    });

    await t.step("should parse a category and a template with no descriptions or prompts", () => {
        const md = `
# Category A
## Template A1
        `;
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        assertEquals(result[0].categoryName, "Category A");
        assertEquals(result[0].description, "");
        assertEquals(result[0].templates.length, 1);
        const templateA1 = result[0].templates[0];
        assertEquals(templateA1.templateName, "Template A1");
        assertEquals(templateA1.description, "");
        assertEquals(templateA1.prompts, []);
        assertEquals(templateA1.categoryName, "Category A");
    });

    await t.step("should parse category, template, description, and one prompt", () => {
        const md = `
# Category B
Cat B desc.
## Template B1
Template B1 desc.
\`\`\`js
console.log("Hello");
\`\`\`
        `;
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        assertEquals(result[0].categoryName, "Category B");
        assertEquals(result[0].description, "Cat B desc.");
        
        const templateB1 = result[0].templates[0];
        assertEquals(templateB1.templateName, "Template B1");
        assertEquals(templateB1.description, "Template B1 desc.");
        assertEquals(templateB1.prompts.length, 1);
        assertEquals(templateB1.prompts[0].language, "js");
        assertEquals(templateB1.prompts[0].body, 'console.log("Hello");');
    });

    await t.step("should parse multiple prompts in one template with descriptions in between", () => {
        const md = `
# Category C
## Template C1
Template C1 desc first part.
\`\`\`
Prompt 1
\`\`\`
Template C1 desc second part.
\`\`\`json
{ "key": "value" }
\`\`\`
        `;
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        const templateC1 = result[0].templates[0];
        assertEquals(templateC1.templateName, "Template C1");
        
        // Parser concatenates descriptions: "desc1\n\ndesc2"
        const expectedDesc = "Template C1 desc first part.\n\nTemplate C1 desc second part.";
        assertEquals(templateC1.description, expectedDesc);
        
        assertEquals(templateC1.prompts.length, 2);
        assertEquals(templateC1.prompts[0].language, "");
        assertEquals(templateC1.prompts[0].body, "Prompt 1");
        assertEquals(templateC1.prompts[1].language, "json");
        assertEquals(templateC1.prompts[1].body, '{ "key": "value" }');
    });

    await t.step("should handle code blocks with different fence lengths (3, 4, 5 backticks)", () => {
        const md = `
# Category D
## Template D1
\`\`\`text
Block with 3 backticks
\`\`\`
\`\`\`\`
Block with 4 backticks
\`\`\`\`
\`\`\`\`\`
Block with 5 backticks
\`\`\`\`\`
        `;
        const result = parseMarkdown(md);
        const templateD1 = result[0].templates[0];
        assertEquals(templateD1.prompts.length, 3);
        assertEquals(templateD1.prompts[0].body, "Block with 3 backticks");
        assertEquals(templateD1.prompts[1].body, "Block with 4 backticks");
        assertEquals(templateD1.prompts[2].body, "Block with 5 backticks");
    });

    await t.step("should ignore '#' and '##' inside code blocks", () => {
        const md = `
# Category E
## Template E1
\`\`\`markdown
# This is not a category
## This is not a template
\`\`\`
        `;
        const result = parseMarkdown(md);
        const templateE1 = result[0].templates[0];
        assertEquals(templateE1.prompts.length, 1);
        assertEquals(templateE1.prompts[0].body, "# This is not a category\n## This is not a template");
    });

    await t.step("should handle multiple categories and templates", () => {
        const md = `
# Category X
Desc X
## Template X1
Desc X1
\`\`\`
Prompt X1
\`\`\`
# Category Y
Desc Y
## Template Y1
Desc Y1
\`\`\`
Prompt Y1
\`\`\`
## Template Y2
Desc Y2
\`\`\`
Prompt Y2
\`\`\`
        `;
        const result = parseMarkdown(md);
        assertEquals(result.length, 2);
        // Category X
        assertEquals(result[0].categoryName, "Category X");
        assertEquals(result[0].description, "Desc X");
        assertEquals(result[0].templates.length, 1);
        assertEquals(result[0].templates[0].templateName, "Template X1");
        assertEquals(result[0].templates[0].description, "Desc X1");
        assertEquals(result[0].templates[0].prompts[0].body, "Prompt X1");

        // Category Y
        assertEquals(result[1].categoryName, "Category Y");
        assertEquals(result[1].description, "Desc Y");
        assertEquals(result[1].templates.length, 2);
        assertEquals(result[1].templates[0].templateName, "Template Y1");
        assertEquals(result[1].templates[0].description, "Desc Y1");
        assertEquals(result[1].templates[0].prompts[0].body, "Prompt Y1");
        assertEquals(result[1].templates[1].templateName, "Template Y2");
        assertEquals(result[1].templates[1].description, "Desc Y2");
        assertEquals(result[1].templates[1].prompts[0].body, "Prompt Y2");
    });

    await t.step("should correctly assign descriptions appearing after prompts to the current template", () => {
        const md = `
# Category F
## Template F1
Description before prompt.
\`\`\`
Prompt content
\`\`\`
Description after prompt, but before next template or category. This should belong to Template F1.
        `;
        const result = parseMarkdown(md);
        const templateF1 = result[0].templates[0];
        const expectedDesc = "Description before prompt.\n\nDescription after prompt, but before next template or category. This should belong to Template F1.";
        assertEquals(templateF1.description, expectedDesc);
        assertEquals(templateF1.prompts.length, 1);
    });
    
    await t.step("should handle template with no prompts but with description", () => {
        const md = `
# Category G
## Template G1
This template has no code blocks, only description.
Line 2 of description.
        `;
        const result = parseMarkdown(md);
        const templateG1 = result[0].templates[0];
        assertEquals(templateG1.templateName, "Template G1");
        assertEquals(templateG1.description, "This template has no code blocks, only description.\nLine 2 of description.");
        assertEquals(templateG1.prompts, []);
    });

    await t.step("should handle code block using tildes (~~~)", () => {
        const md = `
# Category H
## Template H1
~~~js
let a = 1;
~~~
        `;
        const result = parseMarkdown(md);
        const templateH1 = result[0].templates[0];
        assertEquals(templateH1.prompts.length, 1);
        assertEquals(templateH1.prompts[0].language, "js");
        assertEquals(templateH1.prompts[0].body, "let a = 1;");
    });

    await t.step("should correctly parse a simplified grok-like template structure", () => {
        const mdSimpleGrokTemplate = `
# grok
Some category description for grok.
## 投稿内容を抽出したい
The template description for "投稿内容を抽出したい".
\`\`\`\`md
POST URL: {{post_url}}
\`\`\`\`
        `;
        const resultSimple = parseMarkdown(mdSimpleGrokTemplate);
        assertEquals(resultSimple.length, 1);
        const catSimple = resultSimple[0];
        assertEquals(catSimple.categoryName, "grok");
        assertEquals(catSimple.description, "Some category description for grok.");
        assertEquals(catSimple.templates.length, 1);
        const tmplSimple = catSimple.templates[0];
        assertEquals(tmplSimple.templateName, "投稿内容を抽出したい");
        assertEquals(tmplSimple.description, "The template description for \"投稿内容を抽出したい\".");
        assertEquals(tmplSimple.prompts.length, 1);
        assertEquals(tmplSimple.prompts[0].language, "md");
        assertEquals(tmplSimple.prompts[0].body, "POST URL: {{post_url}}");
    });
});

Deno.test("Markdown Parser: Complex ChatGPT-like structure from Template.md", async (t) => {
    // This test uses a structure similar to the ChatGPT example in Template.md
    const md = `
# ChatGPT

TODO: いいかんじで選択してコピペしたい

- https://github.com/podhmo/individual-sandbox/tree/master/daily/20250512/example_html 

## 良さそうなプロンプト集

### 箇条書き

例を自信度と共に出力する


\`\`\`js
'messages': [
    { "role": "system", "content": "Test system message" },
    { "role": "user", "content": "{{prompt}}" }
],
\`\`\`

### 文章

\`\`\`
文章表現は一切変えずに...
{{target_text}}
\`\`\`

Text after last prompt, still part of "良さそうなプロンプト集".
## 次のテンプレート
次のテンプレートの説明
\`\`\`
prompt for 次のテンプレート
\`\`\`
`;

    await t.step("ChatGPT category and '良さそうなプロンプト集' template details", () => {
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        const chatGptCategory = result[0];
        assertEquals(chatGptCategory.categoryName, "ChatGPT");
        
        const expectedCatDesc = `TODO: いいかんじで選択してコピペしたい

- https://github.com/podhmo/individual-sandbox/tree/master/daily/20250512/example_html`;
        assertEquals(chatGptCategory.description, expectedCatDesc);

        assertEquals(chatGptCategory.templates.length, 2);
        const promptTemplate = chatGptCategory.templates[0];
        assertEquals(promptTemplate.templateName, "良さそうなプロンプト集");

        const expectedPromptTemplateDesc = `### 箇条書き

例を自信度と共に出力する\n\n### 文章\n\nText after last prompt, still part of "良さそうなプロンプト集".`;
        assertEquals(promptTemplate.description, expectedPromptTemplateDesc);

        assertEquals(promptTemplate.prompts.length, 2);
        assertEquals(promptTemplate.prompts[0].language, "js");
        assertEquals(promptTemplate.prompts[0].body, `'messages': [\n    { "role": "system", "content": "Test system message" },\n    { "role": "user", "content": "{{prompt}}" }\n],`);
        assertEquals(promptTemplate.prompts[1].language, "");
        assertEquals(promptTemplate.prompts[1].body, "文章表現は一切変えずに...\n{{target_text}}");
    });

    await t.step("Next template ('次のテンプレート') in ChatGPT category", () => {
        const result = parseMarkdown(md); // Re-parse or use from previous step if stateful
        const chatGptCategory = result[0];
        const nextTemplate = chatGptCategory.templates[1];
        
        assertEquals(nextTemplate.templateName, "次のテンプレート");
        assertEquals(nextTemplate.description, "次のテンプレートの説明");
        assertEquals(nextTemplate.prompts.length, 1);
        assertEquals(nextTemplate.prompts[0].body, "prompt for 次のテンプレート");
    });
});

Deno.test("Markdown Parser: Edge Cases", async (t) => {
    await t.step("should return empty array for markdown with only non-header text", () => {
        const md = `
This is some text.
But no category or template headers.
        `;
        const result = parseMarkdown(md);
        assertEquals(result, []);
    });

    await t.step("should handle text at the very beginning before any headers", () => {
        const md = `
Preface text.
# Category 1
Description
        `;
        // Current parser behavior: Preface text is ignored as it's before any known structure.
        // Description lines are collected once a category/template is active.
        const result = parseMarkdown(md);
        assertEquals(result.length, 1);
        assertEquals(result[0].categoryName, "Category 1");
        assertEquals(result[0].description, "Description"); // "Preface text." is not included.
    });
});
