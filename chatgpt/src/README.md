# Prompt Template Clipper

A simple Single Page Application (SPA) to manage and use LLM prompt templates.
This application allows users to:

- View prompt templates organized by categories.
- Input values for placeholders within templates.
- Copy the finalized prompt to the clipboard.
- Load templates from a user-specified Markdown file URL.

## Features

-   **Categorized Templates**: Prompts are organized by `# Category` and `## Template Name` from a Markdown source.
-   **Placeholder Support**: Templates can use `{{placeholder_name}}` syntax for dynamic input.
-   **Clipboard Copy**: Easily copy the generated prompt.
-   **History API Navigation**: Supports browser back/forward buttons.
-   **Custom Markdown Source**: Load templates from any accessible Markdown URL via a query parameter (`?source=URL_TO_MARKDOWN`). Defaults to `./Template.md`.
-   **Dark Mode by Default**: Uses Pico.css with dark theme.
-   **Mobile-First UI**: Designed to be responsive and usable on mobile devices.

## Tech Stack

-   Vanilla JavaScript (ESM)
-   [Preact](https://preactjs.com/) (via CDN) for UI components and rendering.
-   [htm](https://github.com/developit/htm) (via CDN) for JSX-like templating in JavaScript.
-   [Pico.css v2](https://picocss.com/) (via CDN) for styling.
-   Custom Markdown parser for template extraction.

## How to Use

1.  Clone or download the files.
2.  Serve the `index.html` file using a local web server (due to ESM module loading and fetch API for `./Template.md`).
    -   Example using Python: `python -m http.server`
    -   Example using Node.js with `serve`: `npx serve .`
3.  Open `index.html` in your browser.

To load a custom Markdown file:
- Append `?source=YOUR_MARKDOWN_URL` to the browser URL.
- Or, use the input field at the bottom of the page to load a new Markdown source.

## Markdown Format for Templates

The application expects a specific Markdown structure:

-   `# Category Name`: Defines a new category. Text following this on subsequent lines (before the next `#` or `##` or code block) is considered the category description.
-   `## Template Name`: Defines a new template under the current category. Text following this on subsequent lines (before the next code block or `##` or `#`) is considered the template description.
-   **Code Blocks** (e.g., ` ``` ` or ` ```` `): The content of code blocks is treated as the prompt template body.
    -   The parser attempts to handle varying numbers of backticks for code block fences.
    -   The language identifier (e.g., ` ```js`) is captured.
-   Any text outside of these structures, within a category or template scope, is treated as a description for that scope.

Example `Template.md`:
```markdown
# My Category
Description for My Category.

## My First Template
Description for the first template.
It can have {{variables}}.

```json
{
  "prompt": "This is a {{thing}} prompt for {{user}}."
}
```

## Another Template
```
Just a simple text prompt.
```
```

## Project Structure

-   `index.html`: Main HTML file.
-   `Template.md`: Default Markdown file with prompt templates.
-   `src/`: Contains all JavaScript modules.
    -   `main.js`: Application entry point.
    -   `router.js`: SPA router.
    -   `markdownParser.js`: Custom Markdown parser.
    -   `dataProvider.js`: Fetches Markdown data.
    -   `appState.js`: Manages application state.
    -   `ui/`: Directory for UI components (Preact and htm based).
        -   `AppShell.js`: Basic application layout (breadcrumbs).
        -   `CategoryListView.js`: Renders the list of categories.
        -   `TemplateListView.js`: Renders the list of templates in a category.
        -   `TemplateDetailView.js`: Renders the details of a single template.
        -   `render.js`: Utility for Preact rendering.
-   `README.md`: This file.

## Notes on the Markdown Parser

The `src/markdownParser.js` is a custom, relatively simple parser tailored to the specified format. It might not cover all Markdown edge cases, especially concerning deeply nested structures or complex Markdown within descriptions that isn't just plain text or simple formatting. The code block parsing attempts to respect the number of backticks used for the fence.
