from django.contrib import messages
from django.shortcuts import redirect
from django.views.generic import DetailView
from accounts.models import Profile
from django.views.generic.edit import UpdateView
from django.urls import reverse_lazy, reverse
from django.contrib.auth.mixins import LoginRequiredMixin


class UserProfileEdit(LoginRequiredMixin, UpdateView):
    model = Profile
    template_name = 'dashboard/dashboard.html'
    fields = ['profile_image', 'city', 'country', 'bio']

    login_url = reverse_lazy('accounts:login')

    def handle_no_permission(self):
        messages.error(self.request, 'You are not logged in')
        return redirect(self.login_url)

    def get_success_url(self):
        slug_value = self.object.slug
        return reverse('accounts:profile-edit', kwargs={'slug': slug_value})


class SideBar(DetailView):
    template_name = 'dashboard/includes/_sidebar.html'
    model = Profile