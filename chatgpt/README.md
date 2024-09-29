# ChatGPT

## 良さそうなプロンプト集

### 箇条書き

例を自信度と共に出力する


```json
'messages': [
    { "role": "system", "content": "要約として適切な絵文字を自信度(0.0~1.0)と共に答えてください。10つ程候補をあげて下さい" },
    { "role": "user", "content": prompt }
],
```

### 文章

```
文章表現は一切変えずに以下の文章に章タイトルを付与してください(markdownを想定しています)
```

```
以下のルールに従って文章を整形してください

- 文章中に章タイトルをつける(markdownを想定してます)
- 文章の意味を極力意味を変更することなく語調などを整える
- 一般向けの読者を想定してテクニカルタームなどは適宜解説を追加する

文章...
```

```
以下のルールに従って文章を整形してください

- 文章中に章タイトルをつける(markdownを想定してます)
- 文章の意味を極力意味を変更することなく語調などを整える
- 最後に全体の要約を追加する

文章...
```