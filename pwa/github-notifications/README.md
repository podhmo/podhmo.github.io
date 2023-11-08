# github notifications

通知をいい感じに消化するためのPWA（を作りたい）

- ./index.hml -- 本体

## dependencies

- https://docs.github.com/en/rest/activity/notifications?apiVersion=2022-11-28
- https://picocss.com/
- https://preactjs.com/

### utilities

- https://transform.tools/html-to-jsx
- https://esbuild.github.io/api/#serve

## dev

components確認

```console
$ make
esbuild --serve=8080 --servedir=. --outdir=dist *.tsx

 > Local:   http://127.0.0.1:8080/
 > Network: http://172.29.141.76:8080/
```

- index http://localhost:8080
- mockup http://localhost:8080/mockup.html
- components http://localhost:8080/components.html