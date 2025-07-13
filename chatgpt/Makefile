test:
	deno test $(find . -name "*.test.ts")
.PHONY: test

serve:
	@echo http://localhost:3333?source=./Template.md
	deno run --allow-net --allow-read jsr:@std/http/file-server --port 3333 --dir .
.PHONY: serve