#!/usr/bin/env python3
import re


def bump_version(text, label):
    match = re.search(r"(?m)^// @version (\d+)\.(\d+)\.(\d+)$", text)
    if not match:
        raise RuntimeError("version missing: " + label)
    old = ".".join(match.groups())
    new = "%d.%d.%d" % (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)) + 1,
    )
    text = text[:match.start()] + "// @version " + new + text[match.end():]
    return text, old, new


def code_flags(text):
    flags = [True] * len(text)
    state = "code"
    quote = ""
    i = 0
    while i < len(text):
        char = text[i]
        following = text[i + 1] if i + 1 < len(text) else ""
        if state == "code":
            if char in ("'", '"'):
                flags[i] = False
                state = "string"
                quote = char
            elif char == "/" and following == "/":
                flags[i] = False
                if i + 1 < len(text):
                    flags[i + 1] = False
                state = "line"
                i += 1
            elif char == "/" and following == "*":
                flags[i] = False
                if i + 1 < len(text):
                    flags[i + 1] = False
                state = "block"
                i += 1
        elif state == "string":
            flags[i] = False
            if char == "\\":
                if i + 1 < len(text):
                    flags[i + 1] = False
                    i += 1
            elif char == quote:
                state = "code"
        elif state == "line":
            flags[i] = False
            if char == "\n":
                state = "code"
        elif state == "block":
            flags[i] = False
            if char == "*" and following == "/":
                if i + 1 < len(text):
                    flags[i + 1] = False
                state = "code"
                i += 1
        i += 1
    return flags


def receiver_start(text, dot_index):
    index = dot_index - 1
    while index >= 0 and text[index].isspace():
        index -= 1

    paren = 0
    bracket = 0
    brace = 0
    while index >= 0:
        char = text[index]
        if char == ")":
            paren += 1
        elif char == "(":
            if paren > 0:
                paren -= 1
            else:
                break
        elif char == "]":
            bracket += 1
        elif char == "[":
            if bracket > 0:
                bracket -= 1
            else:
                break
        elif char == "}":
            brace += 1
        elif char == "{":
            if brace > 0:
                brace -= 1
            else:
                break
        elif paren == 0 and bracket == 0 and brace == 0:
            if char.isspace() or char in ";,{}=+-*/!?:&|<>":
                break
        index -= 1
    return index + 1


def matching_paren(text, open_index):
    depth = 0
    state = "code"
    quote = ""
    index = open_index
    while index < len(text):
        char = text[index]
        following = text[index + 1] if index + 1 < len(text) else ""
        if state == "code":
            if char in ("'", '"'):
                state = "string"
                quote = char
            elif char == "/" and following == "/":
                state = "line"
                index += 1
            elif char == "/" and following == "*":
                state = "block"
                index += 1
            elif char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth == 0:
                    return index
        elif state == "string":
            if char == "\\":
                index += 1
            elif char == quote:
                state = "code"
        elif state == "line":
            if char == "\n":
                state = "code"
        elif state == "block":
            if char == "*" and following == "/":
                state = "code"
                index += 1
        index += 1
    return -1


def split_args(source):
    args = []
    start = 0
    paren = 0
    bracket = 0
    brace = 0
    state = "code"
    quote = ""
    index = 0
    while index < len(source):
        char = source[index]
        following = source[index + 1] if index + 1 < len(source) else ""
        if state == "code":
            if char in ("'", '"'):
                state = "string"
                quote = char
            elif char == "/" and following == "/":
                state = "line"
                index += 1
            elif char == "/" and following == "*":
                state = "block"
                index += 1
            elif char == "(":
                paren += 1
            elif char == ")":
                paren -= 1
            elif char == "[":
                bracket += 1
            elif char == "]":
                bracket -= 1
            elif char == "{":
                brace += 1
            elif char == "}":
                brace -= 1
            elif char == "," and paren == 0 and bracket == 0 and brace == 0:
                args.append(source[start:index].strip())
                start = index + 1
        elif state == "string":
            if char == "\\":
                index += 1
            elif char == quote:
                state = "code"
        elif state == "line":
            if char == "\n":
                state = "code"
        elif state == "block":
            if char == "*" and following == "/":
                state = "code"
                index += 1
        index += 1

    tail = source[start:].strip()
    if tail or args:
        args.append(tail)
    return args


def find_calls(text, method):
    flags = code_flags(text)
    pattern = re.compile(r"\." + re.escape(method) + r"\s*\(")
    calls = []
    for match in pattern.finditer(text):
        dot_index = match.start()
        if dot_index >= len(flags) or not flags[dot_index]:
            continue
        open_index = text.find("(", dot_index, match.end() + 1)
        if open_index < 0:
            continue
        close_index = matching_paren(text, open_index)
        if close_index < 0:
            raise RuntimeError("unclosed call: " + method)
        start = receiver_start(text, dot_index)
        receiver = text[start:dot_index].strip()
        if not receiver:
            continue
        args = split_args(text[open_index + 1:close_index])
        calls.append((start, close_index + 1, receiver, args))
    return calls


def replace_calls(text, method, builder):
    replacements = []
    for start, end, receiver, args in find_calls(text, method):
        replacement = builder(receiver, args)
        if replacement is not None:
            replacements.append((start, end, replacement))
    for start, end, replacement in reversed(replacements):
        text = text[:start] + replacement + text[end:]
    return text


def require_count(method, args, count):
    if len(args) != count:
        raise RuntimeError(
            "%s expected %d args, found %d: %r"
            % (method, count, len(args), args)
        )


def one_arg_builder(method, wrapper):
    def build(receiver, args):
        require_count(method, args, 1)
        return "%s(%s, %s)" % (wrapper, receiver, args[0])
    return build


def two_arg_builder(method, wrapper):
    def build(receiver, args):
        require_count(method, args, 2)
        return "%s(%s, %s, %s)" % (
            wrapper,
            receiver,
            args[0],
            args[1],
        )
    return build


def replace_code_tokens(text, patterns):
    flags = code_flags(text)
    replacements = []
    for pattern, replacement in patterns:
        for match in re.finditer(pattern, text):
            if match.start() < len(flags) and flags[match.start()]:
                replacements.append((match.start(), match.end(), replacement))
    replacements.sort(key=lambda item: item[0])
    filtered = []
    last_end = -1
    for item in replacements:
        if item[0] < last_end:
            continue
        filtered.append(item)
        last_end = item[1]
    for start, end, replacement in reversed(filtered):
        text = text[:start] + replacement + text[end:]
    return text


def tint_methods(text):
    flags = code_flags(text)
    found = set()
    pattern = re.compile(r"\.([A-Za-z_$][A-Za-z0-9_$]*TintList)\s*\(")
    for match in pattern.finditer(text):
        if match.start() < len(flags) and flags[match.start()]:
            found.add(match.group(1))
    return sorted(found)


def rewrite_color_calls(text):
    for method, wrapper in (
        ("setTextColor", "toolhubSafeSetTextColor"),
        ("setHintTextColor", "toolhubSafeSetHintTextColor"),
        ("setLinkTextColor", "toolhubSafeSetLinkTextColor"),
        ("setHighlightColor", "toolhubSafeSetHighlightColor"),
        ("setBackgroundColor", "toolhubSafeSetBackgroundColor"),
        ("setTint", "toolhubSafeSetTintColor"),
        ("setColor", "toolhubSafeSetColor"),
    ):
        text = replace_calls(text, method, one_arg_builder(method, wrapper))

    text = replace_calls(
        text,
        "setStroke",
        two_arg_builder("setStroke", "toolhubSafeSetStroke"),
    )

    def shadow_builder(receiver, args):
        require_count("setShadowLayer", args, 4)
        return "toolhubSafeSetShadowLayer(%s, %s, %s, %s, %s)" % (
            receiver,
            args[0],
            args[1],
            args[2],
            args[3],
        )

    text = replace_calls(text, "setShadowLayer", shadow_builder)

    def filter_builder(receiver, args):
        if len(args) == 1:
            return "toolhubSafeApplyColorFilter(%s, %s)" % (
                receiver,
                args[0],
            )
        if len(args) == 2:
            return "toolhubSafeSetColorFilter(%s, %s, %s)" % (
                receiver,
                args[0],
                args[1],
            )
        raise RuntimeError("setColorFilter unsupported args: %r" % (args,))

    text = replace_calls(text, "setColorFilter", filter_builder)

    for method in tint_methods(text):
        def tint_builder(receiver, args, method_name=method):
            require_count(method_name, args, 1)
            return 'toolhubSafeApplyColorStateList(%s, "%s", %s)' % (
                receiver,
                method_name,
                args[0],
            )
        text = replace_calls(text, method, tint_builder)

    def state_builder(receiver, args):
        require_count("addState", args, 2)
        if not args[0].lstrip().startswith("["):
            return None
        return "%s.addState(toolhubJintArray(%s), %s)" % (
            receiver,
            args[0],
            args[1],
        )

    text = replace_calls(text, "addState", state_builder)
    text = replace_code_tokens(text, (
        (
            r"new\s+(?:Packages\.)?android\.content\.res\.ColorStateList\s*\(",
            "toolhubSafeColorStateListFromStates(",
        ),
        (
            r"new\s+ColorStateList\s*\(",
            "toolhubSafeColorStateListFromStates(",
        ),
        (
            r"(?:Packages\.)?android\.content\.res\.ColorStateList\.valueOf\s*\(",
            "toolhubSafeColorStateList(",
        ),
    ))
    return text


def rewrite_module(path, text, theme_path, bridge_begin, bridge_end):
    if path != theme_path:
        return rewrite_color_calls(text)
    start = text.find(bridge_begin)
    end = text.find(bridge_end)
    if start < 0 or end <= start:
        raise RuntimeError("safe bridge markers missing")
    return (
        rewrite_color_calls(text[:start])
        + text[start:end]
        + rewrite_color_calls(text[end:])
    )


def sync_version_contracts(scripts_dir, self_path, changes):
    for path in scripts_dir.glob("*.py"):
        if path == self_path:
            continue
        original = path.read_text(encoding="utf-8")
        text = original
        matched = [
            (name, old, new)
            for name, old, new in changes
            if name in text and old in text
        ]
        counts = {}
        for _, old, _ in matched:
            counts[old] = counts.get(old, 0) + 1
        for _, old, new in matched:
            if counts[old] == 1:
                text = text.replace('"%s"' % old, '"%s"' % new)
                text = text.replace("'%s'" % old, "'%s'" % new)
        if text != original:
            path.write_text(text.rstrip("\n") + "\n", encoding="utf-8")
