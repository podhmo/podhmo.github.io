test:
	deno test $(find . -name "*.test.ts")
.PHONY: test

serve:
	deno run --allow-net --allow-read jsr:@std/http/file-server --port 3333 --dir .
.PHONY: serve