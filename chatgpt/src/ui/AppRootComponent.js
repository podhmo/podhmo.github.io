import { h } from 'preact';
import { default as htm } from 'htm';

const html = htm.bind(h);

/**
 * The main application root component.
 * Renders the overall page structure including header, content area, and footer.
 *
 * @param {object} props - Component properties.
 * @param {import('preact').ComponentChild} props.breadcrumbsVNode - The VNode for the breadcrumbs.
 * @param {import('preact').ComponentChild} props.mainContentView - The VNode for the main content view.
 * @param {string} props.currentSourceUrl - The current source URL for the input field.
 * @param {(newUrl: string) => void} props.onLoadSourceUrl - Callback function when load button is clicked.
 */
export function AppRootComponent({ breadcrumbsVNode, mainContentView, currentSourceUrl, onLoadSourceUrl }) {
    const handleSubmit = (event) => {
        event.preventDefault();
        const inputElement = document.getElementById('sourceUrlInput_approot');
        if (inputElement && inputElement.value.trim()) {
            onLoadSourceUrl(inputElement.value.trim());
        }
    };

    return html`
        <header class="container">
            <h1>Prompt Template Clipper</h1>
            ${breadcrumbsVNode}
        </header>
        <main class="container" id="content-area-approot">
            ${mainContentView}
        </main>
        <footer class="container">
            <p>
                <small>
                    <a href="?source=./Template.md">Template.md</a> /
                    <a href="?source=./WritingSkills.md">WritingSkills.md</a>
                    を読み込んで表示してる (
                    <a href="https://github.com/podhmo/podhmo.github.io/tree/master/chatgpt">GitHub</a>
                    ) — Powered by Vanilla JS, Preact & Pico.css
                </small>
            </p>
            <form onSubmit=${handleSubmit}>
                <label for="sourceUrlInput_approot">Load from URL:</label>
                <fieldset role="group">
                    <input
                        type="text"
                        id="sourceUrlInput_approot"
                        name="sourceUrl"
                        placeholder="Enter URL of Markdown file..."
                        value=${currentSourceUrl}
                    />
                    <button type="submit" id="loadSourceUrlButton_approot">Load</button>
                </fieldset>
            </form>
        </footer>
    `;
}
