from django.views.generic import ListView
from blog.models import Article


class ArticleListView(ListView):
    """Server-side renders the article index so crawlers see real content.

    The initial page load shows all published articles in a numbered list.
    search.js and index.js still enhance the page with client-side filtering,
    search, and sorting, but the critical content is visible without JS.
    """

    model = Article
    template_name = "blog/article_list.html"
    context_object_name = "articles"
    paginate_by = 10  # matches JS PAGE_SIZE in index.js

    def get_queryset(self):
        return (
            Article.objects
            .filter(status=Article.Status.REVIEWED)
            .select_related("author", "category")
            .prefetch_related("tags")
            .order_by("-created_at")
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)

        # Build a set of unique category names for the chips (server-side)
        categories = (
            Article.objects
            .filter(status=Article.Status.REVIEWED)
            .values_list("category__name", flat=True)
            .distinct()
            .order_by("category__name")
        )
        ctx["categories"] = [c for c in categories if c]

        ctx["meta_description"] = (
            "Every story, filed and sorted. Browse all published articles on Bitra."
        )

        return ctx
