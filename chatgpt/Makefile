test:
	node --test $(find . -name "*.test.ts")
.PHONY: test

serve:
	@echo http://localhost:3333?source=./Template.md
	python3 -m http.server 3333 --directory .
.PHONY: serve