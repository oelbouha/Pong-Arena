import { Route } from "../../router/index.js"
import { navigate_to, urlConcat } from "../../router/utils.js"
import { is_authenticated } from "../../networking.js"
import SignUp from "./signup.js"
import OAuthFollowUp from "./oauth_signup_follow.js"
import EmailVerification from "./email_verification.js"
import MultiFactorAuth from "./mfa.js"
import './password_reset.js'

import MainNotifier from "../Notifier.js"
import { set_notifier } from "../../utils/index.js"

class Auth extends Route {

    constructor()
    {
        super()

        this.lazyLoad()

        if (is_authenticated()) navigate_to("/")
    }
    
    async lazyLoad()
    {
        const Login = await import("./login.js")
        customElements.define('wc-login', Login.default)
    }

    connectedCallback() {
        if (is_authenticated()) {
            navigate_to("/")
            return
        }
        if (urlConcat(location.pathname, '/') == urlConcat(this.dataset.path, '/')) {
            navigate_to(urlConcat(location.pathname, '/login'), false)
        }
        const notifsWrapper = this.shadowRoot.getElementById('notifsWrapper')
        set_notifier(new MainNotifier(notifsWrapper))
    }
    disconnectedCallback() {
    }
    get styles() {
        return /*css*/ `
            @import url('/themes.css');
            :host {
                display: flex;
            }
            #container {
                display: flex;
                flex-direction: column;
                color: silver;
                width: 100%;
                height: 100%;
                background-color: rgba(var(--dark-color-2-rgb), .75);
            }

            header {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                padding: .5rem 1rem;
                background: rgba(0, 0, 0, 0.2);
            }
            header img {
                height: 4rem;
            }

            header .actions {
                display: flex;
                gap: .5rem;
                margin-left: auto;
            }
            header .actions wc-link {
                padding: .75rem 1.25rem;
                font-size: 1.25rem;
                border: 0;
                border-radius: .25rem;
                background: var(--accent-color);
                color: black;
                transition: filter .3s ease;
                font-family: "Montserrat";
            }
            header .actions wc-link.login {
                background: #f1f1e6;
                color: #222;
            }
            header .actions wc-link:hover {
                filter: brightness(1.3)
            }
            
            #main {
                margin: auto;
                font-family: Montserrat;
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 2rem 1rem;
                flex: 1;
            }
            footer {
                text-align: center;
                font-family: "Montserrat";
                padding: 1rem;
                background: rgba(0, 0, 0, 0.2);
            }
            #notifsWrapper {
                position: absolute;
                top: 6rem;
                right: 1rem;
                width: 30rem;
                max-width: min(calc(100% - 2rem), 30rem);
            }
        `
    }
    html() {
        const header = /*html*/ `
            <header>
                <div>
                    <img src="https://static.vecteezy.com/system/resources/thumbnails/012/986/755/small_2x/abstract-circle-logo-icon-free-png.png">
                </div>

                <div class="actions">
                    <wc-link class="login" data-to="/auth/login">login</wc-link>
                    <wc-link class="logout" data-to="/auth/signup">sign up</wc-link>
                </div>
            </header>
        `
        const router = /*html*/ `
            <wc-router 
                id="main"
                class="mw-100"
                data-root="${this.dataset.path}"
                data-redirect-on-mismatch="${ urlConcat(this.dataset.path, '/login/') }"
            >
                <wc-login data-path="/login" data-exact-path="true"></wc-login>
                <wc-signup data-path="/signup" data-exact-path="true"></wc-signup>
                <wc-oauth-follow data-path="/oauth-follow-up" data-exact-path="true" data-protected></wc-oauth-follow>
                <wc-email-verification data-path="/email-verification" data-exact-path="true" data-protected></wc-email-verification>
                <wc-mfa data-path="/mfa/" data-exact-path="true" data-protected></wc-mfa>
                <wc-password-reset data-path="/password-reset/" data-exact-path="true"></wc-password-reset>
            </wc-router>
        `
        const notifications = /*html*/ `
            <div id="notifsWrapper" class="column fixed gap-1">
            </div>
        `

        return /*html*/`
            <style> ${this.styles} </style>
            <div id="container">
                ${header}    
                ${router}
                ${notifications}
                <footer>
                    © 2023 42 transcendence. All rights reserved.
                </footer>
            </div>        `
    }
}

// customElements.define('wc-login', Login)
customElements.define('wc-signup', SignUp)
customElements.define('wc-oauth-follow', OAuthFollowUp)
customElements.define('wc-email-verification', EmailVerification)
customElements.define('wc-mfa', MultiFactorAuth)

export default Auth