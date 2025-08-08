# Diagram Previewer

This is a lightweight, browser-based diagram previewer that requires no bundling or build steps. It leverages modern web technologies like ES Modules, Import Maps, and WebAssembly to provide a fast and responsive user experience.

## Features

-   **Mobile-First Design**: The UI is fully responsive and works great on any screen size, powered by [Pico.css v2](https://picocss.com/).
-   **Zero Build**: Runs directly in the browser without any need for Node.js, npm, or bundlers like Webpack/Vite.
-   **Multiple Engines**: Supports three different diagram rendering engines:
    1.  **Mermaid**: For creating a wide variety of diagrams and charts with a simple, markdown-like syntax.
    2.  **Graphviz (WASM)**: A WebAssembly port of the powerful Graphviz layout engine (`@hpcc-js/wasm`) for high-performance, client-side rendering.
    3.  **Graphviz (JS)**: A JavaScript-based implementation (`d3-graphviz`) for robust Graphviz rendering.
-   **Live Error Feedback**: Syntax errors from the diagram parsers are caught and displayed clearly in the UI.
-   **Lazy Loading**: Libraries are loaded asynchronously. The UI is interactive immediately, and rendering capabilities are enabled once the required libraries are ready.
-   **CDN-Powered**: All dependencies are loaded directly from the [esm.sh](https://esm.sh/) CDN via HTML Import Maps.

## How to Use

1.  You don't need to install any dependencies.
2.  You need a local web server to serve the files, because ES Modules have security restrictions (`CORS`) and won't work if you open `index.html` directly from the filesystem (`file://` protocol).

    A simple way to start a server is to use Python:
    ```bash
    # If you have Python 3
    python3 -m http.server
    ```
    Or use `npx` if you have Node.js:
    ```bash
    npx serve
    ```
3.  Open your browser and navigate to the local server address (e.g., `http://localhost:8000`).

## File Structure

-   `index.html`: The main HTML file containing the UI structure and the import map for dependencies.
-   `style.css`: Custom styles to manage the layout, complementing Pico.css.
-   `main.js`: The application's entry point. It handles UI events and orchestrates the rendering process.
-   `renderer.js`: A module that dynamically imports and delegates rendering tasks to the appropriate engine-specific module.
-   `renderers/`: A directory containing the logic for each rendering engine.
    -   `mermaid.js`: Handles rendering for Mermaid diagrams.
    -   `d3-graphviz.js`: Handles rendering for Graphviz using the d3-graphviz library.
    -   `graphviz-wasm.js`: Handles rendering for Graphviz using the @hpcc-js/wasm library.
-   `README.md`: This file.
