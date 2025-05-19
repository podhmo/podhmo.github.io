
import {  assertEquals,  assertExists,  assertMatch } from "jsr:@std/assert@1.0.13";
import { CategoryTemplates,  extractVariables,  generateTemplateId,  parseMarkdownToHierarchicalTemplates } from "./parse.ts";




Deno.test("extractVariables Suite", async (t) => {
  await t.step("Single variable", () => {
    assertEquals(extractVariables("Hello {{name}}!"), ["name"]);
  });
  await t.step("Multiple variables", () => {
    assertEquals(extractVariables("{{greeting}}, {{name}}! You are {{age}}."), ["greeting", "name", "age"]);
  });
  await t.step("No variables", () => {
    assertEquals(extractVariables("No variables here."), []);
  });
  await t.step("Duplicate variables", () => {
    assertEquals(extractVariables("{{name}} and {{name}} again."), ["name"]);
  });
  await t.step("Variable with spaces", () => {
    assertEquals(extractVariables("{{ spaced name }}"), ["spaced name"]);
  });
  await t.step("Adjacent variables", () => {
    assertEquals(extractVariables("{{var1}}{{var2}}"), ["var1", "var2"]);
  });
  await t.step("Variables with surrounding text", () => {
    assertEquals(extractVariables("Text before {{var1}} text between {{var2}} text after."), ["var1", "var2"]);
  });
  await t.step("Empty variable name", () => {
    assertEquals(extractVariables("{{}}"), []);
  });
  await t.step("Multiline variable name (trimmed)", () => {
    assertEquals(extractVariables("{{\nmultiline\nname\n}}"), ["multiline\nname"]);
  });
  await t.step("Var with underscores and hyphens", () => {
    assertEquals(extractVariables("{{ var_with_underscores }} and {{var-with-hyphens}}"), ["var_with_underscores", "var-with-hyphens"]);
  });
});

Deno.test("generateTemplateId Suite", async (t) => {
  const idRegex = /^(untitled-template-[a-z0-9]+|[a-z0-9_-]+)$/;
  const fallbackIdRegex = /^untitled-template-[a-z0-9]+$/;

  await t.step("Simple case", () => {
    assertEquals(generateTemplateId("Category Name", "Template Name"), "category-name-template-name");
  });
  await t.step("Japanese characters (numbers/latin extracted)", () => {
    assertEquals(generateTemplateId("カテゴリ１", "テンプレートA"), "a");
  });
  await t.step("Spaces handling", () => {
    assertEquals(generateTemplateId("  Leading Trailing Spaces  ", "  Test  "), "leading-trailing-spaces-test");
  });
  await t.step("Special characters and multiple hyphens", () => {
    assertEquals(generateTemplateId("Special!@#Chars", "Template---Name"), "specialchars-template-name");
  });
  await t.step("Mixed case", () => {
    assertEquals(generateTemplateId("UPPERCASE", "lowercase"), "uppercase-lowercase");
  });
  await t.step("Empty category name", () => {
    assertEquals(generateTemplateId("", "Only Template"), "only-template");
  });
  await t.step("Empty template name", () => {
    assertEquals(generateTemplateId("Only Category", ""), "only-category");
  });
  await t.step("Fallback ID for empty names", () => {
    const fallbackId = generateTemplateId("", "");
    assertMatch(fallbackId, fallbackIdRegex);
  });
  await t.step("Fallback ID for non-ASCII only names", () => {
    const nonAsciiId = generateTemplateId("日本語のみ", "名前なし");
    assertMatch(nonAsciiId, fallbackIdRegex);
  });
  await t.step("Accented characters", () => {
    assertEquals(generateTemplateId("C@tégory Námë", "Témplàte Titlé"), "ctegory-name-template-title");
  });
  await t.step("Numbers and special chars (trailing special removed)", () => {
    assertEquals(generateTemplateId("Category 1", "Template with !@#$"), "category-1-template-with");
  });
  await t.step("Leading/trailing hyphens in input", () => {
    assertEquals(generateTemplateId("---StartEndHyphens---", "---T---"), "startendhyphens-t");
  });
  await t.step("Underscores in names", () => {
    assertEquals(generateTemplateId("My_Category", "My_Template_Var"), "my_category-my_template_var");
  });
});

Deno.test("parseMarkdownToHierarchicalTemplates Suite", async (t) => {
  const idRegex = /^(untitled-template-[a-z0-9]+|[a-z0-9_-]+)$/;

  await t.step("Basic: 1 category, 1 template", () => {
    const md = `
# Category One
## Template Alpha
This is the description.
\`\`\`
Hello {{name}}!
\`\`\`
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category One",
        templates: [
          {
            id: "category-one-template-alpha",
            name: "Template Alpha",
            template: "Hello {{name}}!",
            variables: ["name"],
            description: "This is the description.",
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Empty markdown", () => {
    const md = "";
    const expected: CategoryTemplates[] = [];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Category only, no templates (not added to result)", () => {
    const md = `# Category Two`;
    const expected: CategoryTemplates[] = [];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Template with no description", () => {
    const md = `
# Category Three
## Template Beta
\`\`\`
Template without description {{var}}.
\`\`\`
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category Three",
        templates: [
          {
            id: "category-three-template-beta",
            name: "Template Beta",
            template: "Template without description {{var}}.",
            variables: ["var"],
            description: undefined,
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });
  
  await t.step("Template with description of only blank lines", () => {
    const md = `
# Category With Empty Desc
## Template Empty Desc
  
  
\`\`\`
Template {{var}}.
\`\`\`
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category With Empty Desc",
        templates: [
          {
            id: "category-with-empty-desc-template-empty-desc",
            name: "Template Empty Desc",
            template: "Template {{var}}.",
            variables: ["var"],
            description: undefined, // Description of only blank lines becomes undefined
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Template with no code block", () => {
    const md = `
# Category Four
## Template Gamma
This template has no code block.
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category Four",
        templates: [
          {
            id: "category-four-template-gamma",
            name: "Template Gamma",
            template: "",
            variables: [],
            description: "This template has no code block.",
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Multiple templates in one category", () => {
    const md = `
# Category Five
## Template Delta
Desc Delta
\`\`\`
Content {{delta}}
\`\`\`
## Template Epsilon
Desc Epsilon
\`\`\`
Content {{epsilon}}
\`\`\`
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category Five",
        templates: [
          {
            id: "category-five-template-delta",
            name: "Template Delta",
            template: "Content {{delta}}",
            variables: ["delta"],
            description: "Desc Delta",
          },
          {
            id: "category-five-template-epsilon",
            name: "Template Epsilon",
            template: "Content {{epsilon}}",
            variables: ["epsilon"],
            description: "Desc Epsilon",
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Multiple categories", () => {
    const md = `
# Category Six
## Template Zeta
\`\`\`
Zeta {{varZ}}
\`\`\`

# Category Seven
## Template Eta
Description Eta.
\`\`\`
Eta {{varE}}
\`\`\`
`;
    const expected: CategoryTemplates[] = [
      {
        categoryName: "Category Six",
        templates: [
          {
            id: "category-six-template-zeta",
            name: "Template Zeta",
            template: "Zeta {{varZ}}",
            variables: ["varZ"],
            description: undefined,
          },
        ],
      },
      {
        categoryName: "Category Seven",
        templates: [
          {
            id: "category-seven-template-eta",
            name: "Template Eta",
            template: "Eta {{varE}}",
            variables: ["varE"],
            description: "Description Eta.",
          },
        ],
      },
    ];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("Different code block fences (```js, ~~~~markdown)", () => {
    const md = `
# Category Eight
## Template Theta
\`\`\`js
var code = "{{js_var}}";
\`\`\`
## Template Iota
~~~~markdown
Some *markdown* {{md_var}}.
~~~~
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result.length, 1);
    assertEquals(result[0].templates.length, 2);
    assertEquals(result[0].templates[0].name, "Template Theta");
    assertEquals(result[0].templates[0].template, 'var code = "{{js_var}}";');
    assertEquals(result[0].templates[1].name, "Template Iota");
    assertEquals(result[0].templates[1].template, "Some *markdown* {{md_var}}.");
  });

  await t.step("Code block with more backticks (````) containing fewer (```)", () => {
    const md = `
# Category Nine
## Template Kappa
Description for Kappa.
\`\`\`\`
This block uses four backticks.
\`\`\`
Still inside Kappa's template body.
\`\`\`\`
And this is outside the template body.
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result.length, 1);
    assertEquals(result[0].templates.length, 1);
    const tpl = result[0].templates[0];
    assertEquals(tpl.name, "Template Kappa");
    assertEquals(tpl.template, "This block uses four backticks.\n```\nStill inside Kappa's template body.");
    assertEquals(tpl.description, "Description for Kappa.");
  });

  await t.step("Only first code block captured", () => {
    const md = `
# Category Ten
## Template Lambda
Description for Lambda.
\`\`\`
First block {{var1}}
\`\`\`
Some text after first block. This should NOT be part of description or template.
\`\`\`
Second block {{var2}}
\`\`\`
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result.length, 1);
    assertEquals(result[0].templates.length, 1);
    const tpl = result[0].templates[0];
    assertEquals(tpl.name, "Template Lambda");
    assertEquals(tpl.template, "First block {{var1}}");
    assertEquals(tpl.variables, ["var1"]);
    assertEquals(tpl.description, "Description for Lambda.");
  });

  await t.step("Spaces and empty lines handling", () => {
    const md = `
# Category Eleven  
##   Template Mu  
  
  Line 1 of desc.  
  
  Line 2 of desc.
  
  \`\`\`
  Template line 1 {{v1}}
  
  Template line 2 {{v2}}
  
  \`\`\`
  
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result.length, 1);
    assertEquals(result[0].categoryName, "Category Eleven");
    assertEquals(result[0].templates.length, 1);
    const tpl = result[0].templates[0];
    assertEquals(tpl.name, "Template Mu");
    assertEquals(tpl.template, "\nTemplate line 1 {{v1}}\n\nTemplate line 2 {{v2}}\n");
    assertEquals(tpl.variables, ["v1", "v2"]);
    assertEquals(tpl.description, "Line 1 of desc.  \n  \nLine 2 of desc.");
  });
  
  await t.step("Description with leading/trailing blank lines", () => {
    const md = `
# Category Desc Trim
## Template Desc Trim


  Actual Description Line 1
  Actual Description Line 2


\`\`\`
{{v}}
\`\`\`
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result[0].templates[0].description, "  Actual Description Line 1\n  Actual Description Line 2");
  });


  await t.step("Malformed: Template def immediately after category name on same line", () => {
    const md = `# Category Twelve## Template Nu
Desc Nu
\`\`\`
Nu {{nu_var}}
\`\`\`
`;
    const parsed = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(parsed.length, 0, "Should not parse invalid structure");
  });
  
  await t.step("Original TS data example (partial)", () => {
    const originalTsDataExample = `
# ビジネスメール
## 社外向け挨拶メール
### 用途
社外の取引先や関係者に送る、丁寧な挨拶メールの基本形です。

### ポイント
-   相手の会社名、部署名、役職、氏名を正確に記述しましょう。
-   時候の挨拶は省略していますが、必要に応じて追加してください。
-   \`{{本文}}\` の部分には、具体的な用件を簡潔に記述します。

### 変数説明
-   \`{{相手部署名}}\`: 相手の所属部署 (例: 営業部)
-   \`{{相手役職}}\`: 相手の役職 (例: 部長)
-   \`{{相手氏名}}\`: 相手の氏名 (例: 山田 太郎)
-   \`{{自分氏名}}\`: 自分の氏名 (例: 佐藤 花子)
-   \`{{本文}}\`: メールの主たる内容
\`\`\`
株式会社〇〇 {{相手部署名}} {{相手役職}}{{相手氏名}}様

いつも大変お世話になっております。株式会社△△の{{自分氏名}}です。

{{本文}}
\`\`\`
## 会議日程調整のお願い
### 用途
会議や打ち合わせの日程調整を相手にお願いする際のメールテンプレートです。
\`\`\`
{{相手氏名}}様

お世話になっております。{{自分氏名}}です。

つきましては、{{会議の目的}}について一度お打ち合わせの機会をいただきたく存じます。
\`\`\`
`;
    const parsedOriginal = parseMarkdownToHierarchicalTemplates(originalTsDataExample);
    assertEquals(parsedOriginal.length, 1);
    assertEquals(parsedOriginal[0].categoryName, "ビジネスメール");
    assertEquals(parsedOriginal[0].templates.length, 2);

    const tpl1 = parsedOriginal[0].templates[0];
    assertEquals(tpl1.name, "社外向け挨拶メール");
    assertMatch(tpl1.id, idRegex);
    assertEquals(tpl1.template, "株式会社〇〇 {{相手部署名}} {{相手役職}}{{相手氏名}}様\n\nいつも大変お世話になっております。株式会社△△の{{自分氏名}}です。\n\n{{本文}}");
    assertEquals(tpl1.variables, ["相手部署名", "相手役職", "相手氏名", "自分氏名", "本文"]);
    const expectedDesc1 = `### 用途
社外の取引先や関係者に送る、丁寧な挨拶メールの基本形です。

### ポイント
-   相手の会社名、部署名、役職、氏名を正確に記述しましょう。
-   時候の挨拶は省略していますが、必要に応じて追加してください。
-   \`{{本文}}\` の部分には、具体的な用件を簡潔に記述します。

### 変数説明
-   \`{{相手部署名}}\`: 相手の所属部署 (例: 営業部)
-   \`{{相手役職}}\`: 相手の役職 (例: 部長)
-   \`{{相手氏名}}\`: 相手の氏名 (例: 山田 太郎)
-   \`{{自分氏名}}\`: 自分の氏名 (例: 佐藤 花子)
-   \`{{本文}}\`: メールの主たる内容`;
    assertExists(tpl1.description);
    assertEquals(tpl1.description!.trim(), expectedDesc1.trim()); // Use trim for comparison robustness

    const tpl2 = parsedOriginal[0].templates[1];
    assertEquals(tpl2.name, "会議日程調整のお願い");
    assertMatch(tpl2.id, idRegex);
    assertEquals(tpl2.template, "{{相手氏名}}様\n\nお世話になっております。{{自分氏名}}です。\n\nつきましては、{{会議の目的}}について一度お打ち合わせの機会をいただきたく存じます。");
    assertEquals(tpl2.variables, ["相手氏名", "自分氏名", "会議の目的"]);
    assertExists(tpl2.description);
    assertEquals(tpl2.description!.trim(), "### 用途\n会議や打ち合わせの日程調整を相手にお願いする際のメールテンプレートです。");
  });

  await t.step("Malformed headings (not at line start) are ignored", () => {
    const md = `
Some text # Not a Category
 More text ## Not a Template
# Real Category
## Real Template
\`\`\`
{{v}}
\`\`\`
`;
    const expected: CategoryTemplates[] = [{
        categoryName: "Real Category",
        templates: [{
            id: "real-category-real-template",
            name: "Real Template",
            template: "{{v}}",
            variables: ["v"],
            description: undefined
        }]
    }];
    assertEquals(parseMarkdownToHierarchicalTemplates(md), expected);
  });

  await t.step("UTF-8 characters in names/descriptions/variables", () => {
    const md = `
# Café
## Pâtisserie Template
Description with éàçüö.
\`\`\`
Content {{crème_brûlée}}
\`\`\`
`;
    const result = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(result.length, 1);
    assertEquals(result[0].categoryName, "Café");
    const tpl = result[0].templates[0];
    assertEquals(tpl.name, "Pâtisserie Template");
    assertEquals(tpl.id, "cafe-patisserie-template");
    assertEquals(tpl.template, "Content {{crème_brûlée}}");
    assertEquals(tpl.variables, ["crème_brûlée"]);
    assertEquals(tpl.description, "Description with éàçüö.");
  });

   await t.step("Empty category name (ignored)", () => {
    const md = `
#
## Template With Empty Category Name
Desc
\`\`\`
Content {{v}}
\`\`\`
`;
    const parsed = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(parsed.length, 0);
  });

  await t.step("Empty template name (ignored)", () => {
    const md = `
# Valid Category
## 
Desc for template with empty name
\`\`\`
Content {{v}}
\`\`\`
`;
    const parsed = parseMarkdownToHierarchicalTemplates(md);
    assertEquals(parsed.length, 1); // Category exists
    assertEquals(parsed[0].templates.length, 0); // But template with empty name is not added
  });
});