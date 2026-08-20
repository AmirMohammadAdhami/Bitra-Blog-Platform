import bleach


ALLOWED_TAGS = [
    # Text
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",

    # Headings / Format
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",

    # Lists
    "ol",
    "ul",
    "li",

    # Block
    "blockquote",

    # Code
    "pre",
    "code",

    # Links
    "a",

    # Images
    "img",

    # Tables
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
]


ALLOWED_ATTRIBUTES = {
    "a": [
        "href",
        "title",
        "target",
    ],

    "img": [
        "src",
        "alt",
        "title",
        "width",
        "height",
    ],

    "table": [
        "border",
    ],

    "th": [
        "colspan",
        "rowspan",
    ],

    "td": [
        "colspan",
        "rowspan",
    ],
}


ALLOWED_PROTOCOLS = [
    "http",
    "https",
]

def sanitize(content: str) -> str:
    return bleach.clean(
        content,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )