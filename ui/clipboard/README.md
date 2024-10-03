# clipboard

- <https://podhmo.github.io/ui/clipboard/write-text.html>
- <https://podhmo.github.io/ui/clipboard/write-code.html>

## write-text.html

textareaに挿入された文字列をクリップボードにコピーするHTML

- navigator.clipboardでクリップボードに触る
    - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API

## write-code.html

よくあるコード例をコピペできるようなやつ

- 右上に絵文字の📋をアイコンとして使うことにした
- 手抜きで`getBoudingClientRect()`を使って右上を判断した
- 要素ごとにイベントをくっつける以外の方法ってあったっけ？
