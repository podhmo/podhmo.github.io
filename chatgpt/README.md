# ChatGPT用のテンプレート集

いいかんじで選択してコピペしたい

- https://podhmo.github.io/chatgpt/
- https://github.com/podhmo/individual-sandbox/tree/master/daily/20250512/example_html 
- [./Template.md](./Template.md)

## development

serve

```bash
make serve
```

test

```bash
make test
```



## ちょっとしたtips

### 箇条書き

例を自信度と共に出力する


```js
'messages': [
    { "role": "system", "content": "要約として適切な絵文字を自信度(0.0~1.0)と共に答えてください。10つ程候補をあげて下さい" },
    { "role": "user", "content": prompt }
],
```

### ai studioの履歴をmarkdownに

1. JSONとしてgoogle driveからダウンロード
2. ダウンロードしたJSONからmarkdownを抽出。

https://gist.github.com/podhmo/41f33ef7f3feaec665e8eaf439ec6c9a

