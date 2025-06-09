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
    const handleLoadClick = () => {
        const inputElement = document.getElementById('sourceUrlInput_approot'); // ID needs to be unique if old one still exists
        if (inputElement && inputElement.value.trim()) {
            onLoadSourceUrl(inputElement.value.trim());
        }
    };

    return html`
        <div class="container">
            <header>
                <h1>Prompt Template Clipper</h1>
                <nav id="breadcrumbs-area-approot">${breadcrumbsVNode}</nav>
            </header>
            <main id="content-area-approot">
                ${mainContentView}
            </main>
            <footer>
                <small>Powered by Vanilla JS, Preact & Pico.css</small>
                <br />
                <p><a href="https://github.com/podhmo/podhmo.github.io/blob/master/chatgpt/Template.md">Template.md</a>を読み込んで表示してる</p>
                <label htmlFor="sourceUrlInput_approot">Load from URL:</label>
                <input
                    type="text"
                    id="sourceUrlInput_approot"
                    name="sourceUrl"
                    placeholder="Enter URL of Markdown file..."
                    value=${currentSourceUrl}
                />
                <button id="loadSourceUrlButton_approot" onClick=${handleLoadClick}>Load</button>
            </footer>
        </div>
    `;
}
