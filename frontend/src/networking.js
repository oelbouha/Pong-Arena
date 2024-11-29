import { navigate_to } from "./router/utils.js"
import { parseJwt } from "./utils/index.js"

let auth_stage = 'unauthenticated'
let token = null;
let expire_at = null
let error = null


const AUTH = "/api/auth"
const MANAGEMENT = "/api/management"
const CHAT = "/api/chat"

export const urls = {
    login:                      `${AUTH}/login/`,
    logout:                     `${AUTH}/logout/`,
    signup:                     `${AUTH}/signup/`,
    oauth_follow_up:            `${AUTH}/signup/oauth-follow-up`,
    refresh:                    `${AUTH}/login/refresh/`,
    change_password:            `${AUTH}/change_password/`,
    reset_password:             `${AUTH}/reset_password/`,
    send_reset_password_email:  `${AUTH}/reset_password/send_email/`,
    verify_email:               `${AUTH}/verify_email/`,
    resend_email:               `${AUTH}/resend_verification_email/`,
    mfa_verify:                 `${AUTH}/mfa/`,
    authenticator_endpoint:     `${AUTH}/mfa/authenticator/`,
    email_endpoint:             `${AUTH}/mfa/email/`,
    email_resend_endpoint:      `${AUTH}/mfa/email/resend/`,
    static_codes_endpoint:      `${AUTH}/mfa/static_codes/`,

    me:                             `${MANAGEMENT}/users/me/`,
    user: (id) =>                   `${MANAGEMENT}/users/${id}/`,
    user_basic: (id) =>             `${MANAGEMENT}/users/${id}/basic/`,
    user_search: (q) =>             `${MANAGEMENT}/users/search/?q=${q}`,
    history: (id, page) =>          `${MANAGEMENT}/users/${id}/history/?q=${page}`,
    user_friends: (id) =>           `${MANAGEMENT}/users/${id}/friends/`,
    block_user: (id) =>             `${MANAGEMENT}/users/${id}/block/`,
    unblock_user: (id) =>           `${MANAGEMENT}/users/${id}/unblock/`,
    friend_requests:                `${MANAGEMENT}/friend-requests/`,
    add_friend:                     `${MANAGEMENT}/friend-requests/`,
    remove_friend:                  `${MANAGEMENT}/friend-requests/`,
    accept_friend_request:          `${MANAGEMENT}/friend-requests/accept_request/`,
    decline_friend_request:         `${MANAGEMENT}/friend-requests/decline_request/`,
    cancel_friend_request:          `${MANAGEMENT}/friend-requests/cancel_request/`,
    friendship: (id) =>             `${MANAGEMENT}/friendships/${id}/`,
    tournaments:                    `${MANAGEMENT}/tournaments/`,
    tournament: (id) =>             `${MANAGEMENT}/tournaments/${id}/`,
    tournament_search: (q) =>       `${MANAGEMENT}/tournaments/search/?q=${q}`,
    lock_tournament: (id) =>        `${MANAGEMENT}/tournaments/${id}/lock/`,
    start_tournament: (id) =>       `${MANAGEMENT}/tournaments/${id}/start_round/`,
    delete_tournament: (id) =>      `${MANAGEMENT}/tournaments/${id}/delete/`,
    join_tournament: (id) =>        `${MANAGEMENT}/tournaments/${id}/join/`,
    leave_tournament: (id) =>       `${MANAGEMENT}/tournaments/${id}/leave/`,
    kick_participant: (id, user) => `${MANAGEMENT}/tournaments/${id}/kick/${user}/`,
    asign_winner: (id) =>           `${MANAGEMENT}/tournaments/${id}/assign_winner/`,

    online_users:                   `${CHAT}/online/`,
    conversations:                 `${CHAT}/conversations/`,
    messages: (id, last) =>         `${CHAT}/messages/${id}/${last?`?last=${last}`:''}`,
    notifications:                 `${CHAT}/notifications/`,
}

const oauth_urls = {
    intra_login:    `${AUTH}/intra/login/`,
    intra_signup:   `${AUTH}/intra/signup/`,
    google_login:   `${AUTH}/google/login/`,
    google_signup:  `${AUTH}/google/signup/`,
}

const token_type_to_stage = {
    email_verification: 'email-verification',
    mfa_auth: 'mfa',
    oauth_partial: 'oauth-follow'
}

export async function get_oauth_url(id)
{
    const ret = await get(oauth_urls[id])
    return ret.body.url
}

token = localStorage.getItem('token') || ''
await refresh()

export async function reload(redirect=true) {
    const authenticated = await refresh()

    if (!authenticated) {
        token = localStorage.getItem('token') || ''

        if (!token) return

        const payload = parseJwt(token)
        set_auth_stage(token_type_to_stage[payload.token_type] || 'unauthenticated')
    }

    else
        navigate_to('/', false)
}

export function get_payload() {
    return parseJwt(token)
}

export function set_stage(token_type) {
    auth_stage = token_type_to_stage[token_type]
}

function set_token(tkn) {
    token = tkn

    const decoded = tkn ? parseJwt(token) : {}
    if (decoded.token_type == 'access') {
        expire_at = new Date(decoded.exp * 1000)
    }
    else {
        localStorage.setItem('token', tkn)
        expire_at = null
        
    }
}
function set_auth_stage(stg) {
    auth_stage = stg
    localStorage.setItem('auth_stage', stg)
}

export function get_token() {
    return token
}

export function is_authenticated() {
    return auth_stage == 'authenticated'
}

export function get_auth_stage() {
    return auth_stage
}

export function get_errors() {
    return error
}

export async function login(data)
{
    const res = await post(urls.login, data)
    if (res.status == 200) {
        set_token(res.body.token)
        set_auth_stage(res.body.stage)
        return res
    }
    
    error = res.body
    return res
}

export async function logout()
{
    const res = await post(urls.logout)

    if (res.status == 200 || res.status == 205 || res.status == 401) {
        set_token('')
        set_auth_stage('unauthenticated')
        return true
    }
    return false
}

export async function signup(data)
{
    const res = await post(urls.signup, data)
    if (res.status != 200) {
        error = res.body
        return false
    }

    set_token(res.body.token)
    set_auth_stage('email-verification')
    return true
}

export async function oauth_follow_up(data, tkn)
{
    const old = token
    token = tkn
    const res = await post(urls.oauth_follow_up, data)
    token = old
    if (res.status != 200) {
        error = res.body
        if (res.status == 403) {
            set_token('')
            set_auth_stage('unauthenticated')
        }
        return res.status
    }

    set_token(res.body.token)
    set_auth_stage('authenticated')
    return res.status
}

export async function mfa_verify(data, tkn)
{
    const old = token
    token = tkn
    const res = await post(urls.mfa_verify, data)
    token = old
    if (res.status != 200) {
        error = res.body
        if (res.status == 401) {
            set_token('')
            set_auth_stage('unauthenticated')
        }
        return res
    }

    set_token(res.body.token)
    set_auth_stage('authenticated')
    return res
}


/**
 * 
 * @returns authentication status
 */
export async function refresh()
{
    expire_at = null
    const res = await post(urls.refresh)

    if (res.status == 200) {
        set_token(res.body.access)
        set_auth_stage('authenticated')
        return true
    }

    set_token('')
    set_auth_stage('unauthenticated')
    error = res.body
    return false
}

export async function verify_account(data)
{
    const res = await post(urls.verify_email, data)

    if (res.status == 200) {
        set_token(res.body.token)
        set_auth_stage(res.body.stage)
        return true
    }
    error = res.body
    return false
}


async function validate_access_token()
{
    const now = Date.now()
    if (expire_at && expire_at < now) {
        return await refresh()
    }
    return true
}


export async function get(uri)
{
    return await request(uri, 'GET')
}
export async function post(uri, data={}, headers={})
{
    return await request(uri, 'POST', data, headers)
}


async function request(uri, method, data = {}, headers = {})
{
    let json = true
    Object.keys(data).forEach(key => {
        if (data[key] instanceof File) json = false
    })

    if (!(await validate_access_token()))
        return {status: 401}

    const auth_header = token ? { "Authorization": `Bearer ${token}` }:{}
    const options = {
        method: method,
        headers: {
            ...auth_header,
            ...headers,
        }        
    }


    if (Object.keys(data).length > 0 ) {
        if (json) {
            options.headers['content-type'] = 'application/json'
            options.body = JSON.stringify(data)
        }
        else {
            const formData = new FormData();
            for (let k in data)
                formData.append(k, data[k])
            options.body = formData
        }
    }

    const res = await fetch(uri, options)
    const body = await res.text()
    const ret = {}


    ret.status = res.status
    ret.ok = res.ok
    ret.headers = {}

    for (let header of res.headers.entries())
        ret.headers[header[0]] = header[1]

    if (ret.headers['content-type'] == 'application/json')
        ret.body = JSON.parse(body || '{}')
    else
        ret.body = res.body

    return ret;
}

export default {
    request,
    post,
    get,
    login,
    mfa_verify,
    get_errors,
    urls,
    delete: async (uri, headers={}) => await request(uri, 'DELETE', {}, headers),
    patch: async (uri, data={}, headers={}) => await request(uri, 'PATCH', data, headers),
}