# 重要事項


- ツールスタック

  - preact
  - htm
  - pico.css v2

- バンドラーは使わずesmoduleを直接ブラウザ上で実行する。
- スマートフォンからの利用を想定（モバイルファースト）

# htm を利用したコードについて

ファイル名は.jsx ではなく .js です
そして以下の部分を守ってください。

## Syntax: like JSX but also lit

The syntax you write when using HTM is as close as possible to JSX:

- Spread props: `<div ...${props}>` instead of `<div {...props}>`
- Self-closing tags: `<div />`
- Components: `<${Foo}>` instead of `<Foo>` _(where `Foo` is a component reference)_
- Boolean attributes: `<div draggable />`


## Improvements over JSX

`htm` actually takes the JSX-style syntax a couple steps further!

Here's some ergonomic features you get for free that aren't present in JSX:

- **No transpiler necessary**
- HTML's optional quotes: `<div class=foo>`
- Component end-tags: `<${Footer}>footer content<//>`
- Syntax highlighting and language support via the [lit-html VSCode extension] and [vim-jsx-pretty plugin].
- Multiple root element (fragments): `<div /><div />`
- Support for HTML-style comments: `<div><!-- comment --></div>`
