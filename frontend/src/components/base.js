import buildShadowRoot from "../utils/buildShadowRoot.js"

class Component extends HTMLElement {
    constructor() {
        super()
        this.registerState && this.registerState()
        buildShadowRoot(this.html(), this)
    }

    
    disconnectedCallback() {
        if (this.eventListeners) {
            this.eventListeners.forEach(l => l.unregister())
            this.eventListeners = []
        }
    }

    render() {
        this.shadowRoot.innerHTML = this.html()
    }
}

export default Component