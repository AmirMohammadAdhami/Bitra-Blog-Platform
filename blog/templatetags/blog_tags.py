from django import template
from django.utils.html import conditional_escape

register = template.Library()


@register.filter
def strip_query(url):
    """Remove query string and fragment from a URL.

    Usage: {{ request.build_absolute_uri|strip_query }}
    """
    if not url:
        return url
    # Split off query string and fragment
    q_pos = url.find("?")
    f_pos = url.find("#")
    end = len(url)
    if q_pos != -1:
        end = min(end, q_pos)
    if f_pos != -1:
        end = min(end, f_pos)
    return url[:end]
