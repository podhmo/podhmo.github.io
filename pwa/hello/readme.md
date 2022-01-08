- https://qiita.com/kkuzu/items/bb6dc999e6b44af5da2e
- https://manifest-gen.netlify.app/
- https://developer.mozilla.org/ja/docs/Web/Manifest

## check locally

https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers#setting_up_to_play_with_service_workers

> In order to facilitate local development, localhost is considered a secure origin by browsers as well.

```console
# toplevel
$ python -m http.server 5555

$ chrome.exe --user-data-dir=/tmp/foo http://localhost:5555/pwa/hello

# these options are not needed.
# $ chrome.exe --user-data-dir=/tmp/foo --allow-insecure-localhost --unsafely-treat-insecure-origin-as-secure=http://localhost:5555 http://localhost:5555/pwa/hello
```
