import mermaid from 'mermaid';

let isInitialized = false;

function stringToElement(svgString) {
    const div = document.createElement('div');
    div.innerHTML = svgString;
    return div.firstElementChild;
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
        await mermaid.parse(source);
        const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}`, source);
        return stringToElement(svg);
    } catch (error) {
        // エラーオブジェクトから詳細な情報を組み立てる
        let detailedMessage = 'Mermaidの構文エラーが発生しました。\n';

        if (error.hash) {
            const { loc, expected } = error.hash;
            detailedMessage += `場所: ${loc.first_line}行目 ${loc.first_column}文字目\n`;
            detailedMessage += `問題のあるテキスト: "${error.hash.text}"\n`;
            if (expected) {
                // 'expected' には期待されるトークンのリストが含まれる場合がある
                detailedMessage += `期待される構文(例): ${expected.join(', ')}\n`;
            }
        } else {
            detailedMessage += error.str || error.message || '不明なエラーです。';
        }
        
        console.error("Mermaid Error Details:", error); // デバッグ用に完全なエラーオブジェクトを出力
        throw new Error(detailedMessage);
    }
}
