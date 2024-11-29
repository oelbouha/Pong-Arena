import Router from './router.js';

class URLlessRouter extends Router {
    connectedCallback()
    {
        window.addEventListener('silentroutechange', this.routeChangeHandler)
        this.routeChangeHandler()
    }
    
    disconnectedCallback()
    {
        window.removeEventListener('silentroutechange', this.routeChangeHandler)
    }
}

customElements.define('wc-urlless-router', URLlessRouter)

export default URLlessRouter;