import buildShadowRoot from '../utils/buildShadowRoot.js';
import { navigate_to, urlConcat } from './utils.js';

const urlParamSyntaxRegEx = new RegExp(/{(?<key>[^:}/]+)(:(?<type>[^}/]+))?}/)

function urlSyntaxToRegEx(url, exact) {
    let match = urlParamSyntaxRegEx.exec(url)
    while (match)
    {
        let filter = '[^/]+', type = match.groups.type
        if (type === 'str')
            filter = "[a-zA-Z-_]+"
        else if (type === 'int')
            filter = "[0-9]+"
        let exp = `(?<${match.groups.key}${type=='int'?'_int':''}>${filter})`

        url = url.replace(match[0], exp)
        match = urlParamSyntaxRegEx.exec(url)
    }
    if (exact) url += "$"
    return new RegExp(url)
}

function createShared()
{
    const mem = {}

    return {
        set: (key, value) => {mem[key] = value},
        get: (key) => mem[key],
        remove: (key) => { delete mem[key]},
        getmem: () => mem
    }

}

class Router extends HTMLElement {
    constructor()
    {
        super();
        this.shared = createShared()

        this.root = this.dataset.path || this.dataset.root || this.closestRoot()
        this.childrenArray = this.buildChildrenArray()
        this.routeChangeHandler = this.routeChangeHandler.bind(this)
        
        this.connectedRoute = null;
        this.render()
        this.findRoute()
    }

    buildChildrenArray() {
        const children = Array
                            .from(this.children)
                            .filter(child => {
                                if (child.dataset.path != undefined) return true
                                child.remove()
                                return false
                            })
        
        children.forEach((el) => {
            el.dataset.path = urlConcat(this.root, el.dataset.path)
            el.dataset.path = urlConcat(el.dataset.path, '/')
            el.path = urlSyntaxToRegEx(el.dataset.path, el.dataset.exactPath != undefined)
            el.shared = this.shared
        })

        return children
    }

    closestRoot() {
        const hasRoot = this.parentElement.closest('wc-route, wc-router')
        if (hasRoot) return hasRoot.root || ''
        return ''
    }

    connectedCallback()
    {
        window.addEventListener('routechange', this.routeChangeHandler)
        window.addEventListener('popstate', this.routeChangeHandler )
        this.routeChangeHandler()
    }
    
    disconnectedCallback()
    {
        window.removeEventListener('routechange', this.routeChangeHandler)
        window.removeEventListener('popstate', this.popStateHander)
    }

    findRoute() {
        const raw = location.pathname
        const route = urlConcat(raw, '/')
        let found = false

        for (let i in this.childrenArray) {
            const child = this.childrenArray[i]
            if (!found && route.search(child.path) == 0) {
                found = true
                this.connectedRoute = child
                continue
            }
            child.remove()
        }
    }

    routeChangeHandler(e = {})
    {
        const raw = (e && e.detail && e.detail.route) || location.pathname
        const old = (e && e.detail && e.detail.old_route)
        const route = urlConcat(raw, '/')

        for (let i in this.childrenArray) {
            const child = this.childrenArray[i]
            if (route.search(child.path) == 0) {
                if (
                    child == this.connectedRoute
                    && !child.dataset.path.includes('{')
                ) {
                    return
                }

                if (this.connectedRoute)
                    this.connectedRoute.remove()
                child.dataset.uri = route
                this.append(child)
                this.connectedRoute = child
                return;
            }

        }
        // default
        if (this.dataset.redirectOnMismatch) navigate_to(this.dataset.redirectOnMismatch)
        else {
            this.replaceChildren(this.childrenArray[0])
            this.connectedRoute = this.childrenArray[0]
        }
    }

    render() {
        buildShadowRoot(/*html*/`
        <style>:host{display: block;}</style>
        <slot></slot>
    `, this)
    }
}

window.addEventListener('router:routechange', e => {
    setTimeout(() => {
        history.replaceState({
            ...history.state,
            mainScroll: e.detail.mainScroll
        }, null)
        delete e.detail.mainScroll
        history.pushState(e.detail, '', e.detail.route)
    }, 0)
})

export default Router;