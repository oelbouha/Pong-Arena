let access_token = null
let error = null

export const urls = {
    login: "/api/auth/login/",
    login_redirect: "/",
    signup: "/api/auth/signup",
    signup_redirect: "/",
    refresh: "/api/auth/login/refresh/"
}

await refresh()

export function get_access_token() {
    return access_token
}

export function is_authenticated() {
    return Boolean(access_token)
}

export function get_errors() {
    return error
}

export async function login(data)
{
    const res = await post(urls.login, data)
    if (res.status != 200) {
        error = res.body
        return false
    }

    access_token = res.body.access
    return true
}

export async function refresh()
{
    const res = await post(urls.refresh)

    if (res.status == 200) {
        access_token = res.body.access
        return
    }
}

export async function get(uri) {
    const res = await fetch(uri)
    const ret = {}

    ret.status = res.status
    ret.headers = res.headers
    ret.body = await res.json()

    return ret
}

export async function post(uri, data = {}, headers = {}) {
    const res = await fetch(uri, {
        method: 'POST',
        headers: {
            ...headers,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    })
    const ret = {}

    ret.status = res.status
    ret.headers = res.headers
    ret.body = res.status == 500 ? { detail: 'server error'} :
                                await res.json()
    return ret;
}
