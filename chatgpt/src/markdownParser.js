/**
 * @typedef {object} ParsedPrompt
 * @property {string} language - コードブロックの言語指定 (例: "js", "md", "")
 * @property {string} body - プロンプトのテンプレート本体
 */

/**
 * @typedef {object} ParsedTemplate
 * @property {string} templateName - テンプレート名
 * @property {string} description - テンプレートの説明文 (Markdown形式)
 * @property {ParsedPrompt[]} prompts - プロンプトの配列
 * @property {string} categoryName - 所属するカテゴリ名
 */

/**
 * @typedef {object} ParsedCategory
 * @property {string} categoryName - カテゴリ名
 * @property {string} description - カテゴリの説明文 (Markdown形式)
 * @property {ParsedTemplate[]} templates - カテゴリに属するテンプレートの配列
 */

/**
 * Markdownテキストをパースして、カテゴリ、テンプレート、プロンプトの構造化データに変換します。
 * - `# CategoryName` : カテゴリ
 * - `## TemplateName` : テンプレート
 * - コードブロック : プロンプト本体
 * - それ以外のテキスト: 説明文
 *
 * 注意: このパーサーは指定された要件に特化した簡易的なものです。
 *       より複雑なMarkdownやエッジケースに対応するには、堅牢なパーサーライブラリの利用を検討してください。
 *       特にコードブロックのネストや、Markdown内のMarkdownの解釈は限定的です。
 *
 * @param {string} markdownText - パース対象のMarkdownテキスト
 * @returns {ParsedCategory[]} パースされたカテゴリの配列
 */
export function parseMarkdown(markdownText) {
    const lines = markdownText.split(/\r?\n/);
    const categories = [];
    let currentCategory = null;
    let currentTemplate = null;
    let currentDescriptionLines = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockLines = [];
    let codeBlockFence = ''; // ``` or ```` etc.

    for (const line of lines) {
        // コードブロックの処理
        if (inCodeBlock) {
            if (line.trim() === codeBlockFence) {
                if (currentTemplate) {
                    currentTemplate.prompts.push({
                        language: codeBlockLang,
                        body: codeBlockLines.join('\n')
                    });
                }
                inCodeBlock = false;
                codeBlockLines = [];
                codeBlockLang = '';
                codeBlockFence = '';
            } else {
                codeBlockLines.push(line);
            }
            continue;
        }

        const codeBlockMatch = line.match(/^(`{3,}|~{3,})(\w*)/); // ```lang or ````lang
        if (codeBlockMatch) {
            inCodeBlock = true;
            codeBlockFence = codeBlockMatch[1]; // ``` or ````
            codeBlockLang = codeBlockMatch[2] || '';
            // 現在のdescriptionをtemplateに割り当て
            if (currentTemplate && currentDescriptionLines.length > 0) {
                currentTemplate.description += currentDescriptionLines.join('\n').trim() + '\n\n';
                currentDescriptionLines = [];
            }
            continue;
        }

        // カテゴリ行 (# CategoryName)
        const categoryMatch = line.match(/^#\s+(.+)/);
        if (categoryMatch && !inCodeBlock) {
            if (currentCategory && currentTemplate && currentDescriptionLines.length > 0) {
                 currentTemplate.description += currentDescriptionLines.join('\n').trim();
                 currentDescriptionLines = [];
            } else if (currentCategory && currentDescriptionLines.length > 0) {
                currentCategory.description += currentDescriptionLines.join('\n').trim();
                currentDescriptionLines = [];
            }


            currentCategory = {
                categoryName: categoryMatch[1].trim(),
                description: '',
                templates: []
            };
            categories.push(currentCategory);
            currentTemplate = null;
            currentDescriptionLines = [];
            continue;
        }

        // テンプレート行 (## TemplateName)
        const templateMatch = line.match(/^##\s+(.+)/);
        if (templateMatch && currentCategory && !inCodeBlock) {
            if (currentTemplate && currentDescriptionLines.length > 0) {
                currentTemplate.description += currentDescriptionLines.join('\n').trim();
            } else if (!currentTemplate && currentCategory && currentDescriptionLines.length > 0) {
                 // カテゴリの説明がテンプレートの直前にあった場合
                currentCategory.description += currentDescriptionLines.join('\n').trim() + '\n\n';
            }
            currentDescriptionLines = [];

            currentTemplate = {
                templateName: templateMatch[1].trim(),
                description: '',
                prompts: [],
                categoryName: currentCategory.categoryName
            };
            currentCategory.templates.push(currentTemplate);
            continue;
        }

        // 上記以外は説明文として蓄積
        if (!inCodeBlock) {
            currentDescriptionLines.push(line);
        }
    }

    // ファイル末尾に残ったdescriptionを処理
    if (currentTemplate && currentDescriptionLines.length > 0) {
        currentTemplate.description += currentDescriptionLines.join('\n').trim();
    } else if (currentCategory && !currentTemplate && currentDescriptionLines.length > 0) {
        currentCategory.description += currentDescriptionLines.join('\n').trim();
    }


    // 各descriptionの末尾の余計な改行をトリム
    categories.forEach(cat => {
        cat.description = cat.description.trim();
        cat.templates.forEach(tmpl => {
            tmpl.description = tmpl.description.trim();
        });
    });

    return categories;
}