import json
from django.views.generic import DetailView
from django.utils.html import strip_tags
from blog.models import Article, Comment
from Security.json_safe import safe_json_ld

class ArticleDetailView(DetailView):
    """Server-side renders the article page so crawlers see real content.

    The template still loads article.js for interactive features (likes,
    bookmarks, comments), but the article body, meta tags, and Open Graph
    data are all in the initial HTML response.
    """

    model = Article
    template_name = "blog/article_detail.html"
    context_object_name = "article"

    # Only show published (REVIEWED) articles.
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(status=Article.Status.REVIEWED)
            .select_related("author", "category")
            .prefetch_related("tags", "comment_set")
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        a = self.object

        # Plain-text summary for meta description (strip HTML tags from content
        # as a fallback when summary is empty).
        description = a.summary or strip_tags(a.content)[:260]
        ctx["meta_description"] = description[:260]

        # Build Open Graph / Twitter Card values
        ctx["og_title"] = a.title
        ctx["og_description"] = description[:200]
        ctx["og_url"] = self.request.build_absolute_uri()
        if a.cover_image:
            ctx["og_image"] = self.request.build_absolute_uri(a.cover_image.url)

        # JSON-LD structured data for Google rich results
        author_name = a.author.full_name or a.author.username if a.author else "Bitra"
        ld = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": a.title,
            "description": description[:300],
            "datePublished": a.created_at.isoformat() if a.created_at else None,
            "dateModified": a.updated_at.isoformat() if a.updated_at else None,
            "author": {"@type": "Person", "name": author_name},
            "publisher": {
                "@type": "Organization",
                "name": "Bitra",
                "url": self.request.build_absolute_uri("/"),
            },
            "mainEntityOfPage": ctx["og_url"],
        }
        if a.cover_image:
            ld["image"] = [ctx["og_image"]]
        ctx["structured_data"] = safe_json_ld(ld)

        # Comments count for the template
        ctx["comments_count"] = a.comment_set.filter(
            status=Comment.Status.APPROVED
        ).count()

        return ctx
