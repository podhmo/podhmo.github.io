# Improvement Tasks

This document outlines the tasks required to implement the new advanced prompt generation features.

## Task Breakdown

### 1. `TemplateDetailView.js` UI Modifications

-   **Add new input fields:**
    -   In `TemplateDetailView.js`, add two new input fields to the UI.
    -   Add a single-line `<input type="text">` for the optional `title`.
    -   Add a multi-line `<textarea>` for the `targetText`.
-   **Arrange UI elements:**
    -   The recommended order of elements should be:
        1.  Optional Title Input
        2.  Existing placeholder/variable inputs
        3.  Target Text Textarea
-   **Repurpose existing UI:**
    -   The existing `<pre><code>` block, which currently shows the simple template output, will be reused to display the final, fully-formed prompt.

### 2. Extend Prompt Generation Logic

-   **Introduce special keywords:**
    -   The system will now recognize two new special keywords within the prompt templates: `{{instruction}}` and `{{safe_document_container}}`.
-   **Define new template structure:**
    -   Users can now create templates that utilize these keywords to define a structured prompt.
    -   **Example Template:**
        ```markdown
        {{title_section}}
        <details>
        <summary>Prompt Details</summary>

        **Instruction:**
        {{instruction}}

        </details>

        ---

        {{safe_document_container}}
        ```
-   **Implement the generation logic in `TemplateDetailView.js`:**
    1.  **Resolve Instruction**: First, process the `{{instruction}}` part of the template, resolving any regular `{{placeholders}}` (e.g., `{{language}}`) within it.
    2.  **Create Safe Container**:
        -   Get the content from the `targetText` textarea.
        -   Analyze the content to determine the required number of backticks for a safe code block (find the longest sequence of backticks and add one).
        -   Wrap the content in a Markdown code block with the calculated number of backticks. This becomes the `safe_document_container`.
    3.  **Handle Optional Title**: If the `title` input has a value, create a Markdown H1 heading (e.g., `# User's Title\n\n`). This is the `title_section`. If the input is empty, this section is an empty string.
    4.  **Assemble Final Prompt**: Substitute the resolved `instruction`, the `safe_document_container`, and the `title_section` into the main template structure.

### 3. Implement Input-aware `targetText` Handling

-   **Add logic to analyze the `targetText` input:**
    -   **If `targetText` is a URL:**
        -   Use the `fetch()` API to retrieve the content from the URL.
        -   Place the fetched text inside the `safe_document_container`.
    -   **If `targetText` is empty:**
        -   Use pre-defined dummy chat history.
        -   Format the history into a readable Markdown document.
        -   Place the formatted history inside the `safe_document_container`.
    -   **If `targetText` is any other text:**
        -   Use the text directly.
        -   Place the text inside the `safe_document_container`.
