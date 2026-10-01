"""KoPubWorld 돋움체 TTF → woff2 서브셋 변환
대상: KS X 1001 한글 2,350자 + KS X 1001 기호(한자 제외) + 영문·숫자·ASCII 기호
실행: pip install fonttools brotli && python3 scripts/build-fonts.py
원본: reference/fonts/*.ttf (git 제외) / 출력: public/fonts/*.woff2
"""
import os
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = 'reference/fonts'
OUT = 'public/fonts'
# Light 는 사용하지 않음 (본문 medium 확정, 2026.10.01.)
WEIGHTS = {'Medium': 'medium', 'Bold': 'bold'}


def ksx1001_chars():
    """EUC-KR(KS X 1001) 2바이트 영역 전체에서 한자(0xCA~0xFD 행) 제외"""
    hangul, symbols = set(), set()
    for hi in range(0xA1, 0xFE + 1):
        if 0xCA <= hi <= 0xFD:  # 한자 4,888자 제외
            continue
        for lo in range(0xA1, 0xFE + 1):
            try:
                ch = bytes([hi, lo]).decode('euc-kr')
            except UnicodeDecodeError:
                continue
            (hangul if 0xAC00 <= ord(ch) <= 0xD7A3 else symbols).add(ch)
    return hangul, symbols


def main():
    hangul, symbols = ksx1001_chars()
    ascii_ = {chr(c) for c in range(0x20, 0x7F)}
    extra = set(' –—‘’“”…·•→←↑↓×✕')
    chars = hangul | symbols | ascii_ | extra
    print(f'한글 {len(hangul)}자 / KS X 1001 기호 {len(symbols)}자 / ASCII {len(ascii_)}자 / 추가 {len(extra)}자')
    os.makedirs(OUT, exist_ok=True)
    for src_name, out_name in WEIGHTS.items():
        src = f'{SRC}/KoPubWorld Dotum {src_name}.ttf'
        out = f'{OUT}/kopub-dotum-{out_name}.woff2'
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.hinting = False  # 웹 표시용, 용량 절감
        font = TTFont(src)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=[ord(c) for c in chars])
        sub.subset(font)
        font.flavor = 'woff2'
        font.save(out)
        before, after = os.path.getsize(src), os.path.getsize(out)
        print(f'{os.path.basename(src)}: {before/1024/1024:.2f}MB → {os.path.basename(out)}: {after/1024:.0f}KB ({after/before*100:.1f}%)')


if __name__ == '__main__':
    main()
