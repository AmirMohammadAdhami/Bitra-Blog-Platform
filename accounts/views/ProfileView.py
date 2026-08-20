from django.views.generic import DetailView, TemplateView
from accounts.models import Profile


class UserProfileEdit(TemplateView):
    """Renders the dashboard shell; auth is enforced client-side (JWT)."""
    template_name = 'dashboard/dashboard.html'


class SideBar(DetailView):
    """Renders the dashboard sidebar."""
    template_name = 'dashboard/includes/_sidebar.html'
    model = Profile