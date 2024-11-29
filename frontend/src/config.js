
export const auth_pattern = new RegExp(/^\/auth\//)
export const LOGIN_URL = "/auth/login"

export const routes = {
    login: '/auth/login',
    singup: '/auth/signup',
    verify_email: '/auth/email-verification',
    oauth_follow_up: '/auth/oauth-follow-up',
    mfa: '/auth/mfa',

    home: '/',
    games: '/games/',
    tournaments: '/tournaments/',
}

const redirs = {
    'unauthenticated': routes.login,
    'email-verification': routes.verify_email,
    'oauth-follow': routes.oauth_follow_up,
    'mfa': routes.mfa,
    'authenticated': routes.home
}

let before_auth_route = null

export function get_redirection_uri(stage) {
    if (stage == 'authenticated')
        return before_auth_route || routes.home
    else if (stage == 'unauthenticated' && !location.pathname.startsWith('/auth/'))
        before_auth_route = location.pathname
    return redirs[stage] || routes.home
}