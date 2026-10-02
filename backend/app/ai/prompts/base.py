import re
from dataclasses import dataclass


@dataclass(frozen=True)
class BuiltPrompt:
    version: str
    system_instruction: str
    user_content: str


# Matches anything that looks like one of our delimiter tags, e.g. <topic>, </SOURCE_MATERIAL>
_DELIMITER_TAG = re.compile(r"</?\s*[A-Za-z_][A-Za-z0-9_\-]*\s*>")


def sanitize_data(value: str) -> str:
    """
    Neutralize untrusted text before placing it inside a delimited block so it cannot
    close the block early or open a fake one. Angle brackets in tag-like sequences are
    replaced with lookalike-free square brackets; all other text is preserved.
    """
    return _DELIMITER_TAG.sub(lambda m: "[" + m.group(0)[1:-1] + "]", value)


def data_block(tag: str, value: str) -> str:
    return f"<{tag}>\n{sanitize_data(value)}\n</{tag}>"
