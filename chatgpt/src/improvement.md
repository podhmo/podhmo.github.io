# Improvement Tasks (Revised)

This document outlines the tasks required to implement the new structured prompt generation feature based on the corrected understanding.

## Core Concept

The core idea is to treat the existing prompt templates as the **"instruction"** part of a larger, structured prompt. The application will dynamically wrap this instruction with a title (optional) and a target document (from a new UI field) into a final, well-formatted Markdown string for the clipboard. The templates themselves will not contain any new special keywords.

## Task Breakdown

### 1. `TemplateDetailView.js` UI Modifications

-   **Add new input fields:**
    -   In `TemplateDetailView.js`, add two new input fields to the UI.
    -   Add a single-line `<input type="text" placeholder="Optional Title...">` for the `title`.
    -   Add a multi-line `<textarea placeholder="Enter target text, a URL, or leave blank for chat history...">` for the `targetText`.
-   **Arrange UI elements:**
    -   The recommended order of elements should be:
        1.  Optional Title Input
        2.  Existing placeholder/variable inputs (if any)
        3.  Target Text Textarea
-   **Modify the "Copy" button:**
    -   The existing "Copy" button's logic will be repurposed. Instead of just copying the processed template, it will now trigger the full structured prompt generation and copy the result. The button's text can be updated to "Generate & Copy Prompt".

### 2. Implement Structured Prompt Generation Logic

-   **Create a new generation function in `TemplateDetailView.js`:**
    -   This function will be called when the "Generate & Copy Prompt" button is clicked.
-   **Generation Steps:**
    1.  **Get Instruction**: Process the current template body using the existing placeholder logic (`{{variable}}` replacement) to get the final `instruction` string.
    2.  **Get UI Inputs**: Get the current values from the `title` and `targetText` input fields.
    3.  **Process Target Document**:
        -   Analyze the `targetText` input string.
        -   **If it's a URL**: `fetch` the content. If the fetch fails, use the URL itself as the text, perhaps with a warning.
        -   **If it's empty**: Use pre-defined dummy chat history, formatted as a readable Markdown document.
        -   **If it's other text**: Use the text directly.
        -   **Create Safe Container**: Take the resulting document text and wrap it in a "dynamic Markdown code block" (calculating the right number of backticks) to create the `safe_document_container` string.
    4.  **Assemble the Final Prompt**: Combine the pieces using a fixed template string within the function.

        ```javascript
        // Inside the generation function
        const finalPrompt = `${title ? `# ${title}\n\n` : ''}<details>
<summary>プロンプト詳細（クリックで展開）</summary>

**【指示】**
${instruction}

</details>

---

${safe_document_container}`;
        ```
    5.  **Copy to Clipboard**: Use the `navigator.clipboard.writeText()` API to copy the `finalPrompt` string.

### 3. Clean up

-   The old logic that directly displayed the processed template in the `<pre><code>` block can be removed or hidden, as the final output is now a combination of more elements and is directly sent to the clipboard. The `<pre><code>` block could optionally be used to preview the final generated prompt.
