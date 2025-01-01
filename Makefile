# for react.html
gen:
	deno run -A jsr:@podhmo/glue@0.1.3/bundle --output-style html _client.tsx > react.html
.PHONY: gen

# for index.html
serve:
	deno run --allow-net --allow-read _tools/html-server.ts --port 8080
	echo open http://localhost:8080/index.html
.PHONY: serve
