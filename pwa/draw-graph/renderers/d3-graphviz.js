import { graphviz } from 'd3-graphviz';

let graphvizInstance;

function initializeInstance(container) {
    if (!graphvizInstance) {
        graphvizInstance = graphviz(container, { useWorker: false });
    } else {
        // コンテナを新しいものに更新
        graphvizInstance.options.element = container;
    }
    return graphvizInstance;
}

export async function renderD3Graphviz(source, container) {
    container.innerHTML = ''; // 描画前にコンテナをクリア
    return new Promise((resolve, reject) => {
        try {
            const instance = initializeInstance(container);
            instance
                .onerror((err) => {
                    // d3-graphvizはエラーをイベントで発火させる
                    reject(new Error(err));
                })
                .renderDot(source, () => {
                    resolve(); // 描画完了
                });
        } catch (error) {
            // 初期化時などの同期エラー
            reject(error);
        }
    });
}