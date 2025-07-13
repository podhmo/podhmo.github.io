# Improvement Tasks (Revised)

This document outlines the tasks required to implement the new structured prompt generation feature.

## Core Concept

The core idea is to treat existing prompt templates as the **"instruction"** part of a larger, structured prompt. The application will dynamically wrap this instruction with a title (optional) and a target document into a final, well-formatted Markdown string. The templates themselves will not contain any special keywords.

## Task Breakdown

### 1. UI Modifications in `TemplateDetailView.js`

-   **Add new input fields:**
    -   Add a single-line `<input type="text" placeholder="Optional Title...">` for the `title`.
    -   Add a multi-line `<textarea placeholder="Enter target text, a URL, or leave blank for chat history...">` for the `targetText`.
-   **Arrange UI elements:**
    -   The recommended order is: Title, existing placeholder variables, Target Text.
-   **Modify the "Copy" button:**
    -   Update the button text to "Generate & Copy Prompt". Its `onClick` event will trigger the new generation logic.

### 2. Implement Structured Prompt Generation Logic

-   **Create a new generation function in `TemplateDetailView.js`:**
    -   This function will orchestrate the entire prompt creation process.
-   **Generation Steps:**
    1.  **Get Instruction**: Process the template body with `{{variable}}` replacements to get the final `instruction` string.
    2.  **Get UI Inputs**: Get values from the `title` and `targetText` fields.
    3.  **Process Target Document**:
        -   Analyze the `targetText` input: fetch if it's a URL, use dummy history if empty, otherwise use the text directly.
        -   The result of this step is the `document_content`.
    4.  **Create Safe Container**: Pass the `document_content` to the new `createSafeDocumentContainer` function (detailed below).
    5.  **Assemble Final Prompt**: Combine the pieces using a fixed template string:
        ```javascript
        const finalPrompt = `${title ? `# ${title}\n\n` : ''}<details>
<summary>プロンプト詳細（クリックで展開）</summary>

**【指示】**
${instruction}

</details>

---

${safe_document_container}`;
        ```
    6.  **Copy to Clipboard**: Copy `finalPrompt` to the clipboard.

### 3. Implement `createSafeDocumentContainer` function

This function is critical for ensuring the prompt's integrity. It implements the **"Dynamic Fenced Code Block"** strategy to prevent user input from breaking the prompt structure.

#### Corner Cases to Address:

-   **Markdown Heading Collision**: User input like `# A heading` could be misinterpreted by the LLM as a prompt instruction heading.
-   **Code Block Nesting**: User input containing ` ``` ` will break a prompt that uses a simple ` ``` ` wrapper.

#### Implementation Details:

1.  **Function Signature**: `createSafeDocumentContainer(text: string): string`
2.  **Scan for Backticks**:
    -   Use a regular expression like `/`\x60{3,}/g` to find all occurrences of 3 or more consecutive backticks in the input `text`.
    -   If no matches are found, the minimum fence length is 3.
    -   If matches are found, iterate through them and find the length of the longest sequence.
    -   The required fence length will be `maxLength + 1`.
3.  **Construct the Fence**: Create the fence string, e.g., ` ```` ` if the required length is 4.
4.  **Return the Container**:
    -   Return the final string: `fence + 'markdown\n' + text + '\n' + fence`.
    -   Adding the `markdown` language hint helps the LLM correctly interpret the content, further mitigating heading collision issues.

This approach ensures that any Markdown syntax within the user's input is treated as literal text within a single, unbreakable code block, thus preserving the integrity of the overall prompt.
