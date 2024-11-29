import { auth_pattern, get_redirection_uri } from "../config.js"
import { get_auth_stage, is_authenticated, set_stage } from "../networking.js"
import RouteChangeEvent, { SilentRouteChangeEvent } from "./events.js"

function navigate_to(path, push = true) {
    if (auth_pattern.test(path) && is_authenticated()) {
        return
    }

    const state = { route: path, old_route: location.pathname }
    

    if (push) {
        const ev = new CustomEvent(
            'router:routechange',
            { composed: true, bubbles: true, detail: state }
        )
        window.dispatchEvent(ev)
    }
    else history.replaceState(state, '', path)

    const ev = new RouteChangeEvent({ composed: true, bubbles: true, detail: state })
    window.dispatchEvent(ev)
}

function silent_navigate_to(path) {
    const state = { route: path }
    const ev = new SilentRouteChangeEvent({ composed: true, bubbles: true, detail: state })
    window.dispatchEvent(ev)
}

function redirect(push_url = false) {
    const stage = get_auth_stage()
    const redir = get_redirection_uri(stage)
    navigate_to(redir, push_url)
}

function urlConcat(start, end) {
    let url

    if (end.startsWith('/') && start.endsWith('/'))
        url = start.slice(0, -1) + end
    else if (end.startsWith('/') || start.endsWith('/'))
        url = start + end
    else
        url = start + '/' + end

    return url
}

let window_ref = null;
let previousUrl = null;

function oauth_popup(url, name = 'popup')
{
    const strWindowFeatures =
        'toolbar=no, menubar=no, width=600, height=700, top=100, left=100';

    if (window_ref === null || window_ref.closed)
        window_ref = window.open(url, name, strWindowFeatures);

    else if (previousUrl !== url) {
        window_ref = window.open(url, name, strWindowFeatures);
        window_ref.focus();
    }

    else
        window_ref.focus();

    window.popup = window_ref

    previousUrl = url;
};

export {
    navigate_to,
    silent_navigate_to,
    redirect,
    urlConcat,
    oauth_popup
}