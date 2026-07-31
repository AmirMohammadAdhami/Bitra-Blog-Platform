from django.views.generic import DetailView, TemplateView
from accounts.models import Profile


class UserProfileEdit(TemplateView):
    """
    Renders the dashboard shell. Auth is JWT-based (stored client-side in
    localStorage), so the Django session is not authoritative here — the
    page itself is public, but dashboard.js checks BitraAPI.isAuthenticated()
    on load and redirects to /accounts/login/ if the visitor has no valid
    access token, then populates the page via the profile API.
    """
    template_name = 'dashboard/dashboard.html'


class SideBar(DetailView):
    template_name = 'dashboard/includes/_sidebar.html'
    model = Profile