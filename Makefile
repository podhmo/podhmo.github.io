gen:
	deno run -A jsr:@podhmo/glue@0.1.3/bundle --output-style html _client.tsx > react.html
.PHONY: gen