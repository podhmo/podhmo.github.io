import { initializeRenderers, render } from './renderer.js';

// DOM Elements
const form = document.getElementById('editor-form');
const engineSelect = document.getElementById('engine-select');
const sourceInput = document.getElementById('source-input');
const previewButton = document.getElementById('preview-button');
const themeSwitcher = document.getElementById('theme-switcher');

// View Switching Elements
const viewSwitcher = document.getElementById('view-switcher');
const viewButtons = viewSwitcher.querySelectorAll('a[role="button"]');
const editorView = document.getElementById('editor-view');
const previewView = document.getElementById('preview-view');

// Panes and Containers
const previewContainer = document.getElementById('preview-container');
const errorContainer = document.getElementById('error-container');
const errorCodeElement = errorContainer.querySelector('code');

const views = {
    editor: editorView,
    preview: previewView,
};

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

function switchView(viewName) {
    // Hide all views
    Object.values(views).forEach(view => view.classList.remove('active'));
    // Deactivate all buttons
    viewButtons.forEach(button => button.removeAttribute('aria-current'));

    // Show the selected view
    const viewToShow = views[viewName];
    if (viewToShow) {
        viewToShow.classList.add('active');
    }
    
    // Activate the corresponding button
    const buttonToActivate = viewSwitcher.querySelector(`[data-view="${viewName}"]`);
    if (buttonToActivate) {
        buttonToActivate.setAttribute('aria-current', 'true');
    }
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
        switchView('preview');
        return;
    }
    
    previewContainer.innerHTML = '<p aria-busy="true">Generating preview...</p>';
    switchView('preview'); // Switch to preview view immediately

    try {
        const resultElement = await render(engine, source, previewContainer);
        if (resultElement) { // d3-graphviz returns null as it renders directly
            updatePreview(resultElement);
        }
    } catch (error) {
        console.error('Rendering failed:', error);
        showError(error.message);
        previewContainer.innerHTML = '<p>An error occurred. Please switch to the Editor view to see details.</p>';
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

viewSwitcher.addEventListener('click', (event) => {
    event.preventDefault();
    const target = event.target.closest('a[data-view]');
    if (target) {
        const viewName = target.dataset.view;
        switchView(viewName);
    }
});


// --- Initialization ---

async function main() {
    try {
        await initializeRenderers();
        engineSelect.disabled = false;
        showLoading(false);
    } catch (error) {
        console.error('Failed to initialize rendering engines:', error);
        showError(`Failed to load a required library: ${error.message}`);
        previewButton.textContent = 'Initialization Failed';
    }
    // Set initial view
    switchView('editor'); 
}

main();