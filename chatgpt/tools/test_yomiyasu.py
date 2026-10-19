"""WritingSkills.md に埋め込んだ yomiyasu が python3 (標準ライブラリのみ) で実行できることを確かめるスモークテスト。

../WritingSkills.md の「## yomiyasu」節から fence ブロック (```py:scripts/... など) を
一時ディレクトリへファイルとして書き出し、SKILL.md に書かれた手順
(lint → check run → verify) をそのまま実行する。ネットワークには触れない。
推敲の質は検査しない (書き直すのは LLM で、scripts は候補の提示と実行記録を担うだけ)。

使い方:
    python3 test_yomiyasu.py
    WRITING_SKILLS_MD=path/to/WritingSkills.md python3 test_yomiyasu.py
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

WRITING_SKILLS_MD = Path(
    os.environ.get("WRITING_SKILLS_MD", Path(__file__).resolve().parent.parent / "WritingSkills.md")
)
SECTION = "yomiyasu"
REQUIRED = [
    "SKILL.md",
    "scripts/yomiyasu_lint.py",
    "scripts/yomiyasu_check.py",
    "scripts/yomiyasu_diff.py",
    "scripts/markdown_visibility.py",
]

FENCE_OPEN = re.compile(r"^(`{3,})[a-z]+:(\S+)$")

SOURCE = "この施策は、チームの生産性を劇的に向上させる鍵となります。新しい仕組みが課題に寄り添い、成功への道を切り拓きます。\n"
FINAL = "この施策で、チームの作業時間を減らせます。新しい仕組みで、課題を一つずつ解決します。\n"


def extract_section(text, name):
    """「## name」節の fence ブロックを {相対パス: 本文} で返す。

    fence の中にも「## 」の見出しがあるので、fence の外の「## 」だけを節の区切りとみなす。
    """
    files = {}
    section = None
    lines = iter(text.splitlines())
    for line in lines:
        if line.startswith("## "):
            section = line[3:].strip()
            continue
        m = FENCE_OPEN.match(line)
        if not m:
            continue
        fence, path = m.groups()
        body = []
        for inner in lines:
            if inner == fence:
                break
            body.append(inner)
        else:
            raise ValueError(f"unclosed fence: {path}")
        if section == name:
            files[path] = "\n".join(body) + "\n"
    return files


class YomiyasuScriptsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp(prefix="yomiyasu-"))
        cls.skill = cls.tmp / "skill"
        cls.files = extract_section(WRITING_SKILLS_MD.read_text(encoding="utf-8"), SECTION)
        for path, body in cls.files.items():
            dest = cls.skill / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(body, encoding="utf-8")

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def setUp(self):
        self.work = Path(tempfile.mkdtemp(dir=self.tmp, prefix="work-"))
        (self.work / "src.md").write_text(SOURCE, encoding="utf-8")
        (self.work / "final.md").write_text(FINAL, encoding="utf-8")

    def run_script(self, name, *args, stdin=None):
        # -I: 環境変数や site-packages に頼らず、標準ライブラリだけで動くことを確かめる
        # stderr は捕まえずにそのまま流す (実行時エラーの traceback を手で実行したときと同じ形で見せる)
        p = subprocess.run(
            [sys.executable, "-I", str(self.skill / "scripts" / name), *args],
            cwd=self.work,
            input=stdin,
            stdout=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        if p.returncode != 0:
            self.fail(
                f"exit {p.returncode}: {name} {' '.join(args)}\n"
                f"{p.stdout}\n"
                f"traceback は上の stderr に出ている。読み方の注意:\n"
                f"- パスは {WRITING_SKILLS_MD} の ## {SECTION} 節から抽出した一時ファイルで、テスト終了時に消える\n"
                f"- 行番号は抽出したファイル内のもので、{WRITING_SKILLS_MD.name} の行番号ではない"
            )
        return p.stdout

    def test_extracted(self):
        # SKILL.md が参照する references/ も含まれていること
        refs = re.findall(r"references/[\w./-]+\.(?:md|txt)", self.files.get("SKILL.md", ""))
        missing = sorted(p for p in set(REQUIRED + refs) if p not in self.files)
        self.assertEqual(missing, [], f"{WRITING_SKILLS_MD} の ## {SECTION} 節に無いファイル")

    def test_lint(self):
        out = self.run_script("yomiyasu_lint.py", "src.md")
        self.assertIn("見直し候補:", out)

    def test_check_run_then_verify(self):
        out = self.run_script(
            "yomiyasu_check.py", "run",
            "--source", "src.md", "--final", "final.md",
            "--stance=説明", "--fact-gaps",
        )
        line = out.splitlines()[1]
        self.assertTrue(line.startswith("yomiyasu-check: executed via=run "), line)
        self.assertIn("checks=lint,diff", line)

        out = self.run_script("yomiyasu_check.py", "verify", "--final", "final.md")
        line = out.splitlines()[1]
        self.assertTrue(line.startswith("yomiyasu-check: executed via=verify "), line)

    def test_check_run_stdin(self):
        # 返答だけで渡す場合 (ファイルを作らない) の経路
        body = f"<<<yomiyasu:original>>>\n{SOURCE}<<<yomiyasu:final>>>\n{FINAL}"
        out = self.run_script("yomiyasu_check.py", "run", "--stdin", "--fact-gaps", stdin=body)
        self.assertIn("yomiyasu-check: executed via=run ", out)

        out = self.run_script("yomiyasu_check.py", "verify", "--final", "-", stdin=FINAL)
        self.assertIn("yomiyasu-check: executed via=verify ", out)


if __name__ == "__main__":
    unittest.main()
