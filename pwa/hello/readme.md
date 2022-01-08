- https://qiita.com/kkuzu/items/bb6dc999e6b44af5da2e
- https://manifest-gen.netlify.app/
- https://developer.mozilla.org/ja/docs/Web/Manifest

## check locally

```console
# toplevel
$ python -m http.server 5555
$ chrome.exe --user-data-dir=/tmp/foo --allow-insecure-localhost --unsafely-treat-insecure-origin-as-secure=http://localhost:5555 http://localhost:5555/pwa/hello
```
