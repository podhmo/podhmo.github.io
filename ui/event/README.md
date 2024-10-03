# event

- <https://podhmo.github.io/ui/event/loaded.html>
- <https://podhmo.github.io/ui/event/click.html>

## loaded.html

DOMのイベントの順序を把握したい

1. scripタグは読み込まれたタイミングで実行される
2. defer付きのscriptタグはHTMLが全部読み込まれたあとに実行される
3. その後DOMContentLoadedが発生する
4. 画像などが全部読み込まれたタイミングでloadが発生する

おもったこと

- イベントの発生順序の全貌がほしい？
    - https://developer.mozilla.org/en-US/docs/Web/API/Window#events
- 一旦asyncのことは忘れる
- bubbling phaseとcapture phaseは第三引数で変えられるけれど気にしなくて良いだろう
- inline scriptのdeferが無効なのは割とめんどくさい

## click.html

- addEventListenerのcapture phaseとbubbling phaseのハンドリングの方法を把握したい
- targetが発火場所でcurrentTargetがlistenerをくっつけた場所ということを把握したい

思ったこと

- コールバックの解除は？ > removeEventListener
- AbortControllerやCloseWatcherは？
