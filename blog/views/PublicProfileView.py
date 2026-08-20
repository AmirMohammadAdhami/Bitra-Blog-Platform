import json
from django.http import Http404
from django.views.generic import DetailView
from django.db.models import Sum
from accounts.models import Profile
from blog.models import Article
from Security.json_safe import safe_json_ld

class PublicProfileView(DetailView):
    """Server-side renders the public profile page so crawlers see real content.

    The template renders the profile card and author articles in pure HTML.
    public_profile.js still loads to enhance the page (sort articles, social
    link icons, interactive features) but the critical content is visible
    without JavaScript.
    """

    model = Profile
    template_name = "accounts/public_profile.html"
    context_object_name = "profile"
    slug_field = "slug"

    def get_object(self, queryset=None):
        slug = self.kwargs.get("slug")
        if not queryset:
            queryset = self.get_queryset()
        # Try slug first, then username fallback
        qs = queryset.select_related("user").prefetch_related(
            "social_links__platform"
        )
        try:
            return qs.get(slug=slug)
        except Profile.DoesNotExist:
            pass
        try:
            return qs.get(user__username=slug)
        except Profile.DoesNotExist:
            raise Http404("Profile not found")

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        profile = self.object
        user = profile.user

        # Display name for OG tags
        display_name = user.full_name or user.username

        ctx["display_name"] = display_name
        ctx["meta_description"] = (
            profile.bio or f"{display_name} — author on Bitra."
        )[:260]

        # Open Graph
        ctx["og_title"] = f"{display_name} — Bitra"
        ctx["og_description"] = ctx["meta_description"][:200]
        ctx["og_url"] = self.request.build_absolute_uri()
        if profile.profile_image:
            ctx["og_image"] = self.request.build_absolute_uri(
                profile.profile_image.url
            )

        # Location string
        parts = [profile.city, profile.country.name if profile.country else None]
        ctx["location"] = ", ".join(p for p in parts if p)

        # Author stats (if user is an author)
        author_stats = None
        if user.is_author:
            articles_qs = Article.objects.filter(author=user)
            published_qs = articles_qs.filter(status=Article.Status.REVIEWED)
            totals = articles_qs.aggregate(
                total_likes=Sum("likes"),
                total_views=Sum("views"),
            )
            author_stats = {
                "total_articles": published_qs.count(),
                "likes": totals["total_likes"] or 0,
                "views": totals["total_views"] or 0,
            }
        ctx["author_stats"] = author_stats

        # Published articles (for the article list section)
        if user.is_author:
            ctx["published_articles"] = (
                published_qs.select_related("category")
                .order_by("-created_at")[:10]
            )
        else:
            ctx["published_articles"] = []

        # JSON-LD structured data
        ld = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": display_name,
            "url": ctx["og_url"],
        }
        if profile.bio:
            ld["description"] = profile.bio[:300]
        if profile.profile_image:
            ld["image"] = ctx["og_image"]
        ctx["structured_data"] = safe_json_ld(ld)

        return ctx
