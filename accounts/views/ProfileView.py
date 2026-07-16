from django.contrib import messages
from django.shortcuts import redirect
from django.views.generic import DetailView, UpdateView
from accounts.models import Profile


class UserProfileEdit(UpdateView):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super(UserProfileEdit, self).dispatch(request, *args, **kwargs)
        else:
            messages.error(request, 'You are not logged in')
            return redirect('accounts:login')


    template_name = 'dashboard/dashboard.html'
    model = Profile
    fields = ['profile_image', 'city', 'country' , 'bio']

class SideBar(DetailView):
    template_name = 'dashboard/includes/_sidebar.html'
    model = Profile