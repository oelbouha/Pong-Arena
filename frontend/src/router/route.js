import Component from '../components/base.js';
import { is_authenticated } from '../networking.js';
import { navigate_to, redirect } from './utils.js';

class Route extends Component {
    constructor()
    {
        super()
        this.path = this.path || ''
        this.extractUrlParams = this.extractUrlParams.bind(this)
    }

    extractUrlParams(uri = this.dataset.uri)
    {
        let params = {}
        const match = (new RegExp(this.path)).exec(uri)
        if (match) params = match.groups

        for (let key in params) {
            if (key.search('_int') >= 0) {
                const newKey = key.replace("_int", "")
                params[newKey] = parseInt(params[key])
                delete params[key]
            }
        }
        return params
    }

    connectedCallback()
    {
        this.urlParams = this.extractUrlParams()
        if (this.dataset.protected != undefined && this.shouldRedirect()) {
            this.redirectTo ? navigate_to(this.redirectTo) : redirect(false)
            return false
        }
        if (this.dataset.component) {
            const component = this.shadowRoot.querySelector(this.dataset.component)
            for(let key in this.urlParams)
                component.setAttribute(key, this.urlParams[key])
        }
        this.onConnected && this.onConnected()
        return true
    }

    shouldRedirect() {
        return !is_authenticated()
    }

    html() {
        let HTML;

        if (this.dataset.component)
            HTML = `<${this.dataset.component}></${this.dataset.component}>`

        else HTML = /*html*/`<slot></slot>`

        return /*html*/`
            <style>@import url('/themes.css');</style>
            ${HTML}
        `
    }
}

export default Route