# install individual tools
setup:
	grep "^mbtx-install" README.md | bash -xe
.PHONY: setup
# ../WritingSkills.md に埋め込んだ yomiyasu の scripts/ が python3 (標準ライブラリのみ) で動くかのスモークテスト
test-yomiyasu:
	python3 test_yomiyasu.py -v
.PHONY: test-yomiyasu
