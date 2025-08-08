import { initializeRenderers, render } from './renderer.js';

// DOM Elements
const form = document.getElementById('editor-form');
const engineSelect = document.getElementById('engine-select');
const sourceInput = document.getElementById('source-input');
const previewButton = document.getElementById('preview-button');
const previewContainer = document.getElementById('preview-container');
const errorContainer = document.getElementById('error-container');
const errorCodeElement = errorContainer.querySelector('code');
const themeSwitcher = document.getElementById('theme-switcher');

// --- Functions ---

function showLoading(isLoading) {
    previewButton.ariaBusy = isLoading ? 'true' : 'false';
    previewButton.disabled = isLoading;
    if (!isLoading) {
        previewButton.textContent = 'Preview';
    }
}

function showError(message) {
    errorCodeElement.textContent = message;
    errorContainer.classList.remove('hidden');
}

function clearError() {
    errorCodeElement.textContent = '';
    errorContainer.classList.add('hidden');
}

function updatePreview(element) {
    previewContainer.innerHTML = '';
    previewContainer.appendChild(element);
}

// --- Event Handlers ---

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    showLoading(true);

    const engine = engineSelect.value;
    const source = sourceInput.value;

    if (!source.trim()) {
        previewContainer.innerHTML = '<p>Please enter some source code.</p>';
        showLoading(false);
        return;
    }
    
    previewContainer.innerHTML = '<p aria-busy="true">Generating preview...</p>';

    try {
        const resultElement = await render(engine, source, previewContainer);
        if (resultElement) { // d3-graphvizは直接描画するため要素を返さない
            updatePreview(resultElement);
        }
    } catch (error) {
        console.error('Rendering failed:', error);
        showError(error.message);
        previewContainer.innerHTML = '<p>An error occurred. See details below.</p>';
    } finally {
        showLoading(false);
    }
});

themeSwitcher.addEventListener('click', (event) => {
    event.preventDefault();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
});


// --- Initialization ---

async function main() {
    try {
        await initializeRenderers();
        // ライブラリのロードが完了したらUIを有効化
        engineSelect.disabled = false;
        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize rendering engines:', error);
        showError(`Failed to load a required library: ${error.message}`);
        previewButton.textContent = 'Initialization Failed';
    }
}

main();