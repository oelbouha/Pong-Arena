import Component from '../components/base.js';
import { navigate_to, silent_navigate_to, urlConcat } from './utils.js';

class Link extends Component {
    constructor() {
        super();
        this.registerClickHandler()
    }

    static get observedAttributes() {
        return ['disabled', 'data-to']
    }

    registerClickHandler() {
        if (!this.dataset.to){
            return
        }
        this.to = urlConcat(this.dataset.to, '/')
    
        this.onclick = e => {
            e.preventDefault()
            e.stopPropagation()
            const evt = new CustomEvent('link:click', {
                composed: true,
                bubbles: true,
                cancelable: true
            })
            this.dispatchEvent(evt)

            if (this.to == location.pathname) return false;
            navigate_to(this.to)
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name == 'disabled') {
            if (newValue != null) { this.onclick = null }
        }
        else this.registerClickHandler()
    }

    html() {
        return /*html*/`
            <style>
                :host {
                    display: block;
                    cursor: pointer;
                }
            </style>
            <slot></slot>
        `
    }
}

class SilentLink extends Link {

    
    registerClickHandler() {
        if (!this.dataset.to){
            return
        }
        this.to = this.dataset.to
    
        this.onclick = e => {
            e.preventDefault()    
            if (this.to == location.pathname) return false;
        
            silent_navigate_to(this.to)
        }
    }

    
}

customElements.define('wc-silent-link', SilentLink)



export default Link;