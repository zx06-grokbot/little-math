#!/usr/bin/env python3
"""重新生成 static/fonts 里的子集字体（加了新的中文文案后运行一次）。

依赖：pip install fonttools brotli
源字体（SIL OFL 1.1，来自 github.com/google/fonts）：
  ofl/nunito/Nunito[wght].ttf
  ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf
用法：python3 scripts/subset-fonts.py <源字体目录>
"""
import glob
import re
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1] if len(sys.argv) > 1 else '.')
out = root / 'static' / 'fonts'

# 站酷快乐体：只保留 src/ 里实际出现的中文和全角标点（测试文件除外）
chars = set()
for f in glob.glob(str(root / 'src' / '**' / '*'), recursive=True):
    if f.endswith(('.svelte', '.ts', '.html', '.css')) and '.test.' not in f:
        text = Path(f).read_text(encoding='utf-8')
        chars |= set(re.findall(r'[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef\u2018-\u201f\u2026\u00b7]', text))
extra = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz +-×÷=()?!.,:/%'
text_file = out / '.kuaile-chars.txt'
text_file.write_text(''.join(sorted(chars)) + extra, encoding='utf-8')

subprocess.run(['pyftsubset', str(src / 'ZCOOLKuaiLe-Regular.ttf'), f'--text-file={text_file}', '--flavor=woff2',
                f'--output-file={out / "zcool-kuaile-subset.woff2"}', '--layout-features=*'], check=True)
subprocess.run(['pyftsubset', str(src / 'Nunito[wght].ttf'),
                '--unicodes=U+0020-007E,U+00A0,U+00B7,U+00D7,U+00F7,U+2013-2014,U+2018-201D,U+2026,U+2212',
                '--flavor=woff2', f'--output-file={out / "nunito-latin-var.woff2"}', '--layout-features=*'], check=True)
text_file.unlink()
print(f'{len(chars)} 个中文字符；输出到 {out}')
