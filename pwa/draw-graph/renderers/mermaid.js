import mermaid from 'mermaid';

let isInitialized = false;

function stringToElement(svgString) {
    const div = document.createElement('div');
    div.innerHTML = svgString;
    return div.firstChild;
}

export async function initialize() {
    if (isInitialized) return;
    mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
    });
    isInitialized = true;
}

export async function renderMermaid(source) {
    try {
        // 先に構文をパースしてエラーをチェック
        await mermaid.parse(source);
        
        // 一意のIDでレンダリング
        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, source);
        return stringToElement(svg);

    } catch (error) {
        // エラーオブジェクトをより分かりやすいメッセージに整形
        const errorMessage = error.str || error.message || 'Unknown Mermaid error';
        throw new Error(errorMessage);
    }
}