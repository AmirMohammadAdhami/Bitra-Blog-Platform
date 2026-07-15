from django.contrib import messages
from django.contrib.auth import logout
from django.shortcuts import redirect


def logout_view(request):
    if request.user.is_authenticated:
        logout(request)
        messages.success(request, 'You are now logged out.')
        return redirect('blog:home')
    else:
        messages.error(request, 'You are not logged in.')
        return redirect('accounts:login')
