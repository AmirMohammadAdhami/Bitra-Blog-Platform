from rest_framework import permissions


class IsAuthorOwnerOrReadOnly(permissions.BasePermission):
    """Writes on articles are for contributors, edits are for the owner.

    - Safe methods (GET/HEAD/OPTIONS): always allowed. *Which* articles are
      visible is decided by the viewset's queryset, not here.
    - Create: only users flagged `is_author` may start a story.
    - Object-level write (update/delete): only the story's own author.
    """

    message = "Only the story’s author can change it."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not (request.user and request.user.is_authenticated):
            return False
        # Object-level checks below gate edits; creation needs the author flag.
        if view.action == 'create':
            return bool(getattr(request.user, 'is_author', False))
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author_id == request.user.id



class IsCommentAuthorOrReadOnly(permissions.BasePermission):
    """Only the comment's own author may edit or delete it."""

    def has_object_permission(self, request, view, obj):
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return obj.author_id == request.user.id
