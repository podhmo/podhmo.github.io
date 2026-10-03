// yomiyasu_lint.py をブラウザ内 pyodide で実行するページのロジック。
// 静的 ESM のみ (bundler なし)。pyodide と lint スクリプトは初回実行時に
// CDN / upstream から lazy load する。

const pyodideVersion = "v314.0.7";
const pyodideIndexUrl = `https://cdn.jsdelivr.net/pyodide/${pyodideVersion}/full/`;
const lintScriptUrl =
    "https://raw.githubusercontent.com/nanaism/yomiyasu/main/skills/yomiyasu/scripts/yomiyasu_lint.py";

const inputEl = document.getElementById("inputText");
const runButton = document.getElementById("runButton");
const statusEl = document.getElementById("status");
const resultArea = document.getElementById("resultArea");
const scoreLine = document.getElementById("scoreLine");
const metricsLine = document.getElementById("metricsLine");
const findingsArea = document.getElementById("findingsArea");

let linterPromise = null;

function setStatus(message) {
    statusEl.textContent = message;
}

// pyodide ランタイムと lint スクリプトをロードし、lintModule.lint_text を
// 呼び出せる状態の pyodide インスタンスを返す (結果はキャッシュ)
async function loadLinter() {
    if (!linterPromise) {
        linterPromise = (async () => {
            const [pyodideModule, lintSource] = await Promise.all([
                import(`${pyodideIndexUrl}pyodide.mjs`),
                fetch(lintScriptUrl).then((res) => {
                    if (!res.ok) {
                        throw new Error(`lint スクリプトの取得に失敗: ${res.status} ${res.statusText}`);
                    }
                    return res.text();
                }),
            ]);
            setStatus(`pyodide ${pyodideVersion} をロード中... (初回は10MB超のWASMを取得します)`);
            const pyodide = await pyodideModule.loadPyodide({ indexURL: pyodideIndexUrl });
            pyodide.globals.set("lintSource", lintSource);
            pyodide.runPython(`
import types
lintModule = types.ModuleType("yomiyasu_lint")
exec(compile(lintSource, "yomiyasu_lint.py", "exec"), lintModule.__dict__)
`);
            return pyodide;
        })();
    }
    return linterPromise;
}

function renderResult(result) {
    const metrics = result.metrics;
    const findings = result.findings;
    scoreLine.textContent = `スコア: ${result.score} / 100 (${findings.length === 0 ? "PASS" : `${findings.length} 件の指摘`})`;
    metricsLine.textContent =
        `文字数: ${metrics.char_count} | 行数: ${metrics.total_lines} | ` +
        `太字頻度: ${metrics.bold_per_1000} /1000字 | 箇条書き比率: ${Math.round(metrics.list_ratio * 1000) / 10}%`;

    findingsArea.innerHTML = "";
    if (findings.length === 0) {
        const p = document.createElement("p");
        p.textContent = "検査ルールによる指摘はありません。";
        findingsArea.appendChild(p);
        return;
    }
    for (const finding of findings) {
        const div = document.createElement("div");
        div.className = "finding";
        div.dataset.severity = finding.severity;
        const head = document.createElement("div");
        head.textContent = `L${finding.line} [${finding.severity.toUpperCase()}] ${finding.message}`;
        div.appendChild(head);
        if (finding.snippet) {
            const pre = document.createElement("pre");
            pre.textContent = finding.snippet;
            div.appendChild(pre);
        }
        findingsArea.appendChild(div);
    }
}

async function runLint() {
    const text = inputEl.value;
    if (!text.trim()) {
        setStatus("テキストを入力してください");
        return;
    }
    runButton.disabled = true;
    resultArea.hidden = true;
    try {
        const pyodide = await loadLinter();
        setStatus("lint 実行中...");
        pyodide.globals.set("inputText", text);
        const resultJson = pyodide.runPython(`
import json
json.dumps(lintModule.lint_text(inputText), ensure_ascii=False)
`);
        renderResult(JSON.parse(resultJson));
        resultArea.hidden = false;
        setStatus("");
    } catch (error) {
        setStatus(`エラー: ${error.message ?? error}`);
    } finally {
        runButton.disabled = false;
    }
}

runButton.addEventListener("click", runLint);
