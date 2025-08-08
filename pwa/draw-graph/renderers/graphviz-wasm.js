import { Graphviz } from '@hpcc-js/wasm';

let graphviz;

function stringToElement(svgString) {
    const div = document.createElement('div');
    div.innerHTML = svgString;
    return div.firstElementChild;
}

export async function initialize() {
    if (!graphviz) {
        graphviz = await Graphviz.load();
    }
}

export async function renderWasmGraphviz(source) {
    if (!graphviz) {
        throw new Error('Graphviz (WASM) is not initialized yet.');
    }
    try {
        const svg = graphviz.dot(source);
        return stringToElement(svg);
    } catch (error) {
        throw new Error(`Graphviz layout failed: ${error.message}`);
    }
}