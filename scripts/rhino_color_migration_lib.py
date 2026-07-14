#!/usr/bin/env python3
from pathlib import Path
import re

IDENT = r'[A-Za-z_$][A-Za-z0-9_$]*'
SIMPLE_CALL = r'\([^;\n()]*\)'
RECEIVER = (
    r'(' + IDENT +
    r'(?:(?:\.' + IDENT + r')(?:' + SIMPLE_CALL + r')?|\[[^\]\n]+\])*)'
)
ARG = r'([^;\n]+?)'


def bump_version(text, label):
    match = re.search(r'(?m)^// @version (\d+)\.(\d+)\.(\d+)$', text)
    if not match:
        raise RuntimeError('version missing: ' + label)
    old = '.'.join(match.groups())
    new = '%d.%d.%d' % (
        int(match.group(1)), int(match.group(2)), int(match.group(3)) + 1
    )
    text = text[:match.start()] + '// @version ' + new + text[match.end():]
    return text, old, new


def replace_one(text, method, wrapper):
    pattern = re.compile(
        RECEIVER + r'\.' + re.escape(method) + r'\(' + ARG + r'\);'
    )
    return pattern.sub(
        lambda m: '%s(%s, %s);' % (wrapper, m.group(1), m.group(2)), text
    )


def replace_two(text, method, wrapper):
    pattern = re.compile(
        RECEIVER + r'\.' + re.escape(method) +
        r'\(([^,\n;]+),\s*([^;\n]+?)\);'
    )
    return pattern.sub(
        lambda m: '%s(%s, %s, %s);' % (
            wrapper, m.group(1), m.group(2), m.group(3)
        ),
        text,
    )


def replace_shadow(text):
    pattern = re.compile(
        RECEIVER +
        r'\.setShadowLayer\(([^,\n;]+),\s*([^,\n;]+),\s*' +
        r'([^,\n;]+),\s*([^;\n]+?)\);'
    )
    return pattern.sub(
        lambda m: 'toolhubSafeSetShadowLayer(%s, %s, %s, %s, %s);' % (
            m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        ),
        text,
    )


def replace_filters(text):
    two = re.compile(
        RECEIVER + r'\.setColorFilter\(([^,\n;]+),\s*([^;\n]+?)\);'
    )
    text = two.sub(
        lambda m: 'toolhubSafeSetColorFilter(%s, %s, %s);' % (
            m.group(1), m.group(2), m.group(3)
        ),
        text,
    )
    one = re.compile(RECEIVER + r'\.setColorFilter\(' + ARG + r'\);')
    return one.sub(
        lambda m: 'toolhubSafeApplyColorFilter(%s, %s);' % (
            m.group(1), m.group(2)
        ),
        text,
    )


def replace_tint_lists(text):
    methods = sorted(set(re.findall(
        r'\.(' + IDENT + r'TintList)\s*\(', text
    )))
    for method in methods:
        pattern = re.compile(
            RECEIVER + r'\.' + re.escape(method) + r'\(' + ARG + r'\);'
        )
        text = pattern.sub(
            lambda m, name=method:
                'toolhubSafeApplyColorStateList(%s, "%s", %s);' % (
                    m.group(1), name, m.group(2)
                ),
            text,
        )
    return text


def rewrite_color_calls(text):
    for method, wrapper in (
        ('setTextColor', 'toolhubSafeSetTextColor'),
        ('setHintTextColor', 'toolhubSafeSetHintTextColor'),
        ('setLinkTextColor', 'toolhubSafeSetLinkTextColor'),
        ('setHighlightColor', 'toolhubSafeSetHighlightColor'),
        ('setBackgroundColor', 'toolhubSafeSetBackgroundColor'),
        ('setTint', 'toolhubSafeSetTintColor'),
        ('setColor', 'toolhubSafeSetColor'),
    ):
        text = replace_one(text, method, wrapper)

    text = replace_two(text, 'setStroke', 'toolhubSafeSetStroke')
    text = replace_shadow(text)
    text = replace_filters(text)
    text = replace_tint_lists(text)

    text = re.sub(
        RECEIVER + r'\.addState\((\[[^\n;]*\]),\s*([^;\n]+?)\);',
        lambda m: '%s.addState(toolhubJintArray(%s), %s);' % (
            m.group(1), m.group(2), m.group(3)
        ),
        text,
    )
    text = re.sub(
        r'new\s+(?:Packages\.)?(?:android\.content\.res\.)?ColorStateList\s*\(',
        'toolhubSafeColorStateListFromStates(',
        text,
    )
    text = re.sub(
        r'(?:Packages\.)?(?:android\.content\.res\.)?ColorStateList\.valueOf\s*\(',
        'toolhubSafeColorStateList(',
        text,
    )
    return text


def rewrite_module(path, text, theme_path, bridge_begin, bridge_end):
    if path != theme_path:
        return rewrite_color_calls(text)
    start = text.find(bridge_begin)
    end = text.find(bridge_end)
    if start < 0 or end <= start:
        raise RuntimeError('safe bridge markers missing')
    return (
        rewrite_color_calls(text[:start]) +
        text[start:end] +
        rewrite_color_calls(text[end:])
    )


def sync_version_contracts(scripts_dir, self_path, changes):
    for path in scripts_dir.glob('*.py'):
        if path == self_path:
            continue
        original = path.read_text(encoding='utf-8')
        text = original

        for name, old, new in changes:
            lines = text.splitlines(True)
            changed_line = False
            for index, line in enumerate(lines):
                if name in line and old in line:
                    lines[index] = line.replace(old, new)
                    changed_line = True
            if changed_line:
                text = ''.join(lines)
                continue

            nearby = re.compile(
                r'(' + re.escape(name) + r'.{0,240}?)(["\']' +
                re.escape(old) + r'["\'])',
                re.S,
            )
            text, count = nearby.subn(
                lambda m: m.group(1) + m.group(2).replace(old, new),
                text,
                count=1,
            )
            if count:
                continue

            if name in text and text.count(old) == 1:
                text = text.replace(old, new, 1)

        if text != original:
            path.write_text(text.rstrip('\n') + '\n', encoding='utf-8')
