/**
 * 選択されたエンジンに応じて動的にレンダラーを呼び出すモジュール
 */

// このモジュールは各レンダラーの初期化と処理の振り分けを行う

export async function initializeRenderers() {
    // 並行して初期化処理を呼び出す
    const initializers = [
        import('./renderers/mermaid.js'),
        import('./renderers/graphviz-wasm.js')
    ];
    const modules = await Promise.all(initializers);
    // 各モジュールのinitialize関数を実行
    await Promise.all(modules.map(m => m.initialize && m.initialize()));
}

/**
 * 描画を実行する
 * @param {string} engine - 使用するエンジン名
 * @param {string} source - 描画するソースコード
 * @param {HTMLElement} container - (オプション) d3-graphvizが使用するコンテナ
 * @returns {Promise<HTMLElement|null>} 描画された要素、またはnull
 */
export async function render(engine, source, container) {
    switch (engine) {
        case 'mermaid': {
            const { renderMermaid } = await import('./renderers/mermaid.js');
            return renderMermaid(source);
        }
        case 'graphviz-wasm': {
            const { renderWasmGraphviz } = await import('./renderers/graphviz-wasm.js');
            return renderWasmGraphviz(source);
        }
        case 'd3-graphviz': {
            const { renderD3Graphviz } = await import('./renderers/d3-graphviz.js');
            // d3-graphvizはコンテナに直接描画するため、戻り値は不要
            await renderD3Graphviz(source, container);
            return null;
        }
        default:
            throw new Error(`Unknown rendering engine: ${engine}`);
    }
}