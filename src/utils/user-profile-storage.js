import { API_BASE_URL_NO_VERSION } from './api-controller';

export function resolveProfileImageUrl(image) {
    const value = String(image || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('/proxy/')) {
        return value.startsWith('/') ? `${API_BASE_URL_NO_VERSION}${value}` : value;
    }
    return `${API_BASE_URL_NO_VERSION}/proxy/media/profile/image/${encodeURIComponent(value)}`;
}

export function formatDisplayMobile(mobile, countryCode) {
    const digits = String(mobile || '').replace(/\D/g, '');
    if (!digits) return '';
    const cc = String(countryCode || '+91').replace(/\D/g, '') || '91';
    const local = digits.length > 10 ? digits.slice(-10) : digits;
    return `+${cc} ${local}`;
}

export function normalizeStoredProfile(profile = {}, fallbacks = {}) {
    const name = profile.name || fallbacks.name || fallbacks.username || 'User';
    const email = profile.email || fallbacks.email || '';
    const rawMobile = profile.mobile || fallbacks.mobile || '';
    const countryCode = profile.country_code || fallbacks.country_code || '+91';
    const mobile = rawMobile ? formatDisplayMobile(rawMobile, countryCode) : '';
    const image = resolveProfileImageUrl(profile.image);

    return {
        profile_id: profile.profile_id || null,
        username: profile.username || fallbacks.username || '',
        user_type: profile.user_type || null,
        name,
        email,
        mobile,
        country_code: countryCode,
        image,
        pan_number: profile.pan_number || null,
        city: profile.city || null,
        state: profile.state || null,
        gender: profile.gender || null,
        date_of_birth: profile.date_of_birth || null,
    };
}

export function saveUserSessionToStorage(result, fallbacks = {}) {
    if (!result) return;

    if (result.token) {
        localStorage.setItem('user_token', result.token);
    }
    if (result.username) {
        localStorage.setItem('user_username', result.username);
    }
    if (result.expire_date) {
        localStorage.setItem('token_expire', result.expire_date);
    }
    if (result.branches) {
        const branchesWithRole = result.branches.map((branch) => ({
            ...branch,
            role: branch.role || (branch.owned ? 'admin' : 'staff'),
        }));
        localStorage.setItem('user_branches', JSON.stringify(branchesWithRole));
    }
    if (result.is_new_user != null) {
        localStorage.setItem('user_is_new', result.is_new_user ? 'true' : 'false');
    }

    const profile = normalizeStoredProfile(result.profile || {}, {
        username: result.username,
        ...fallbacks,
    });

    localStorage.setItem('user_name', profile.name);
    if (profile.email) {
        localStorage.setItem('user_email', profile.email);
    } else {
        localStorage.removeItem('user_email');
    }
    if (profile.mobile) {
        localStorage.setItem('user_mobile', profile.mobile);
    } else {
        localStorage.removeItem('user_mobile');
    }
    if (profile.image) {
        localStorage.setItem('user_profile_image', profile.image);
    } else {
        localStorage.removeItem('user_profile_image');
    }

    localStorage.setItem('user_profile', JSON.stringify(profile));
}

export function loadUserProfileFromStorage() {
    try {
        const raw = localStorage.getItem('user_profile');
        if (raw) {
            return normalizeStoredProfile(JSON.parse(raw), {
                username: localStorage.getItem('user_username') || '',
            });
        }
    } catch (error) {
        console.error('Failed to parse stored user profile:', error);
    }

    return normalizeStoredProfile({}, {
        username: localStorage.getItem('user_username') || '',
        name: localStorage.getItem('user_name') || '',
        email: localStorage.getItem('user_email') || '',
        mobile: localStorage.getItem('user_mobile') || '',
        image: localStorage.getItem('user_profile_image') || '',
    });
}

export function clearUserSessionFromStorage() {
    [
        'user_token',
        'user_username',
        'user_email',
        'user_name',
        'user_mobile',
        'user_profile_image',
        'user_profile',
        'user_branches',
        'branch_id',
        'branch_name',
        'branch_owned',
        'branch_role',
        'userData',
        'token_expire',
        'user_is_new',
    ].forEach((key) => localStorage.removeItem(key));
}
