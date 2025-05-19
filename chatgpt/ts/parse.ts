// parser.ts (または任意のファイル名)

// --- 型定義 ---
export interface Template {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

export interface CategoryTemplates {
  categoryName: string;
  templates: Template[];
}

// --- ヘルパー関数 ---

/**
 * テンプレート文字列から {{変数名}} 形式の変数を抽出します。
 * @param templateString テンプレート本文
 * @returns 変数名の配列 (重複なし、トリム済み)
 */
export function extractVariables(templateString: string): string[] {
  const regex = /\{\{([\s\S]+?)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(templateString)) !== null) {
    matches.add(match[1].trim());
  }
  return Array.from(matches);
}

/**
 * カテゴリ名とテンプレート名からIDを生成します。
 * URLフレンドリーな形式を目指します。
 * @param categoryName カテゴリ名
 * @param templateName テンプレート名
 * @returns 生成されたID文字列
 */
export function generateTemplateId(
  categoryName: string,
  templateName: string,
): string {
  const sanitize = (str: string): string => {
    if (typeof str !== "string") return "";
    return str
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const sanCategory = sanitize(categoryName);
  const sanTemplate = sanitize(templateName);

  if (!sanCategory && !sanTemplate) {
    return `untitled-template-${Date.now().toString(36)}${
      Math.random().toString(36).substring(2, 7)
    }`;
  }
  if (!sanTemplate && sanCategory) {
    return sanCategory;
  }
  if (!sanCategory && sanTemplate) {
    return sanTemplate;
  }

  return `${sanCategory}-${sanTemplate}`;
}

// --- メインパーサー関数 ---

/**
 * 指定されたMarkdownサブセットの文字列を解析し、CategoryTemplates[] 形式のデータを返します。
 * @param markdown 解析対象のMarkdown文字列
 * @returns 解析結果の CategoryTemplates 配列
 */
export function parseMarkdownToHierarchicalTemplates(
  markdown: string,
): CategoryTemplates[] {
  const result: CategoryTemplates[] = [];
  const lines = markdown.split(/\r?\n/);

  let currentCategory: CategoryTemplates = {
    categoryName: "",
    templates: [],
  };
  let currentTemplateData: {
    name: string;
    rawDescriptionLines: string[];
    templateLines: string[];
    firstCodeBlockCaptured: boolean;
  } = {
    name: "",
    rawDescriptionLines: [],
    templateLines: [],
    firstCodeBlockCaptured: false,
  };

  let inCodeBlock = false;
  let codeBlockFence: string | null = null;

  function finalizeCurrentTemplate() {
    if (
      currentTemplateData && currentCategory && currentTemplateData.name.trim()
    ) {
      const templateBody = currentTemplateData.templateLines.join("\n");

      const descriptionLinesFiltered = currentTemplateData.rawDescriptionLines
        .map((line) => line.trimEnd())
        .filter((line, index, arr) => {
          if (
            (index === 0 && line.trim() === "") ||
            (index === arr.length - 1 && line.trim() === "" && arr.length > 1)
          ) {
            // 先頭または末尾の完全に空の行は除去 (ただし、要素が1つだけの場合は内容を尊重)
            return false;
          }
          return true;
        });

      let descriptionStr = descriptionLinesFiltered.join("\n");
      if (descriptionLinesFiltered.every((l) => l.trim() === "")) { // 全行が空白なら空にする
        descriptionStr = "";
      } else if (descriptionLinesFiltered.length > 0) {
        // descriptionの先頭と末尾の全体的な空白行を除去
        let start = 0;
        while (
          start < descriptionLinesFiltered.length &&
          descriptionLinesFiltered[start].trim() === ""
        ) start++;
        let end = descriptionLinesFiltered.length - 1;
        while (end >= start && descriptionLinesFiltered[end].trim() === "") {
          end--;
        }
        descriptionStr = descriptionLinesFiltered.slice(start, end + 1).join(
          "\n",
        );
      }

      const description = descriptionStr ? descriptionStr : undefined;

      const variables = extractVariables(templateBody);
      const id = generateTemplateId(
        currentCategory.categoryName,
        currentTemplateData.name,
      );

      currentCategory.templates.push({
        id,
        name: currentTemplateData.name.trim(),
        template: templateBody,
        variables,
        description,
      });
    }
    currentTemplateData = {
      name: "",
      rawDescriptionLines: [],
      templateLines: [],
      firstCodeBlockCaptured: false,
    };
  }

  function startNewCategory(name: string) {
    finalizeCurrentTemplate();

    if (currentCategory && currentCategory.templates.length > 0) {
      result.push(currentCategory);
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      currentCategory = {
        categoryName: "",
        templates: [],
      };
      return;
    }
    currentCategory = { categoryName: trimmedName, templates: [] };
    currentTemplateData = {
      name: "",
      rawDescriptionLines: [],
      templateLines: [],
      firstCodeBlockCaptured: false,
    };
    inCodeBlock = false;
    codeBlockFence = null;
  }

  function startNewTemplate(name: string) {
    finalizeCurrentTemplate();

    const trimmedName = name.trim();
    if (!currentCategory || !trimmedName) {
      currentTemplateData = {
        name: "",
        rawDescriptionLines: [],
        templateLines: [],
        firstCodeBlockCaptured: false,
      };
      return;
    }
    currentTemplateData = {
      name: trimmedName,
      rawDescriptionLines: [],
      templateLines: [],
      firstCodeBlockCaptured: false,
    };
    inCodeBlock = false;
    codeBlockFence = null;
  }

  for (const line of lines) {
    if (inCodeBlock) {
      if (codeBlockFence && line.trim() === codeBlockFence) {
        inCodeBlock = false;
        codeBlockFence = null;
      } else if (
        currentTemplateData && currentTemplateData.firstCodeBlockCaptured
      ) {
        currentTemplateData.templateLines.push(line);
      }
      continue;
    }

    const categoryMatch = line.match(/^#\s+(.+)/);
    if (categoryMatch) {
      startNewCategory(categoryMatch[1]);
      continue;
    }

    if (!currentCategory) {
      continue;
    }

    const templateMatch = line.match(/^##\s+(.+)/);
    if (templateMatch) {
      startNewTemplate(templateMatch[1]);
      continue;
    }

    if (!currentTemplateData) {
      continue;
    }

    const codeBlockStartMatch = line.match(/^(\`{3,}|~{3,})\s*(\S*)\s*$/);
    if (
      codeBlockStartMatch && currentTemplateData &&
      !currentTemplateData.firstCodeBlockCaptured
    ) {
      inCodeBlock = true;
      codeBlockFence = codeBlockStartMatch[1].trim();
      currentTemplateData.firstCodeBlockCaptured = true;
      continue;
    }

    if (
      !inCodeBlock && currentTemplateData &&
      !currentTemplateData.firstCodeBlockCaptured
    ) {
      currentTemplateData.rawDescriptionLines.push(line);
    }
  }

  finalizeCurrentTemplate();
  if (currentCategory && currentCategory.templates.length > 0) {
    result.push(currentCategory);
  }

  return result;
}
