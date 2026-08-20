from django.views.generic import TemplateView
from blog.models import Article


class HomeTemplateView(TemplateView):
    """Server-side renders the front page so crawlers see real content.

    The template renders the lead story + latest articles in pure HTML.
    front.js still loads to enhance the page (re-sort, load popular authors,
    add scroll reveals) but the critical above-the-fold content is visible
    without JavaScript.
    """

    template_name = "home/home.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)

        # All published articles, newest first — limited to what fits on
        # the front page.  We over-fetch a bit so JS has room to re-sort.
        articles = (
            Article.objects
            .filter(status=Article.Status.REVIEWED)
            .select_related("author", "category")
            .prefetch_related("tags")
            .order_by("-created_at")[:24]
        )

        # Lead = most viewed; fallback to newest
        by_views = sorted(articles, key=lambda a: a.views or 0, reverse=True)
        lead = by_views[0] if by_views else None

        # Latest 4 excluding the lead
        latest = [a for a in articles if lead and a.id != lead.id][:4]

        # Most-read rail (top 5 excluding lead)
        most_read = [a for a in by_views if lead and a.id != lead.id][:5]

        # Remaining grouped by category
        used_ids = {a.id for a in ([lead] if lead else []) + latest + most_read}
        rest = [a for a in articles if a.id not in used_ids]

        # Group by category name
        groups = {}
        for a in rest:
            key = a.category.name if a.category else "Dispatches"
            groups.setdefault(key, []).append(a)

        ctx["lead"] = lead
        ctx["latest"] = latest
        ctx["most_read"] = most_read
        ctx["category_groups"] = groups

        # SEO
        ctx["meta_description"] = (
            "Bitra — an independent broadsheet of essays, reportage and criticism. "
            "All the thought that's fit to type."
        )

        return ctx
