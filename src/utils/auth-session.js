import { clearUserSessionFromStorage } from './user-profile-storage';

const PUBLIC_PATH_PREFIXES = ['/login', '/register', '/branch-setup', '/invitation'];

export function isPublicAuthPath(pathname = window.location.pathname) {
    const path = String(pathname || '');
    return PUBLIC_PATH_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );
}

export function handleUnauthorizedResponse() {
    if (isPublicAuthPath()) {
        return false;
    }

    clearUserSessionFromStorage();
    localStorage.removeItem('token');
    localStorage.removeItem('username');

    const returnPath = `${window.location.pathname}${window.location.search}`;
    if (returnPath && returnPath !== '/login') {
        sessionStorage.setItem('post_login_redirect', returnPath);
    }

    window.location.href = '/login';
    return true;
}
