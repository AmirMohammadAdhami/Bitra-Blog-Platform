from django.contrib import messages
from django.shortcuts import redirect
from django.views.generic import DetailView
from accounts.models import Profile


class UserProfile(DetailView):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super(UserProfile, self).dispatch(request, *args, **kwargs)
        else:
            messages.error(request, 'You are not logged in')
            return redirect('accounts:login')


    template_name = 'author/author_dashboard.html'
    model = Profile