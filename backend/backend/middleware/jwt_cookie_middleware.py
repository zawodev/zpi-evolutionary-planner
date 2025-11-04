from typing import Callable

class JWTAuthCookieMiddleware:
    """Middleware that moves JWT access token from cookie into Authorization header.

    This allows using rest_framework_simplejwt.authentication.JWTAuthentication with
    tokens stored as HttpOnly cookies named 'access'. The middleware only sets the
    header if it's not already present.
    """
    def __init__(self, get_response: Callable):
        self.get_response = get_response

    def __call__(self, request):
        if 'HTTP_AUTHORIZATION' not in request.META:
            access_token = request.COOKIES.get('access')
            if access_token:
                request.META['HTTP_AUTHORIZATION'] = f'Bearer {access_token}'
        return self.get_response(request)

