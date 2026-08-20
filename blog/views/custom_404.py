from django.shortcuts import render


def custom_404(request, exception):
    """Render the vintage newspaper 404 page."""
    return render(request, "404.html", status=404)
