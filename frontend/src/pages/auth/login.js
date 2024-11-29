import Route from "../../router/route.js"
import API, { get_errors, login as creds_login, get_oauth_url, reload, set_stage } from "../../networking.js"
import { oauth_popup, redirect } from "../../router/utils.js"
import { addEventListener, notify, parseJwt } from "../../utils/index.js"

import "../../components/Input.js"
import { loading } from "./helpers.js"
import { Notification } from "../Notifier.js"
import Notifications from "../../components/Notifications.js"

const login = loading(creds_login)



class Login extends Route {
    constructor() {
        super()
        this.auth_listener = this.auth_listener.bind(this)
        this.eventListeners = []
    }
    
    connectedCallback() {
        const loginForm = this.shadowRoot.getElementById('credsLogin')
        const socialLogins = this.shadowRoot.getElementById('socialLogins')
        const channel = new BroadcastChannel('auth')
        
        this.eventListeners.push(
            addEventListener(loginForm, 'submit', (e) => {
                e.preventDefault()
                e.stopPropagation()
                this.login()
            }),
            addEventListener(loginForm, 'send', (e) => {
                e.stopPropagation()
                this.login()
            }),
            addEventListener(socialLogins, 'click', async (e) => {
                const closest = e.target.closest('button')
                if (!closest) return
    
                const id = closest.id
                const url = await get_oauth_url(id)
                if (url)
                    oauth_popup(url)
                else
                    notify(new Notifications('Auth provider not supported'))
            }),
            addEventListener(channel, 'message', this.auth_listener)
        )
    }
    disconnectedCallback() {
        this.eventListeners.forEach(ev => ev.unregister())
    }

    getValidatedCredentials() {
        const inputs = Array.from(this.shadowRoot.querySelectorAll('wc-input'))
        const err = inputs.reduce((p, c) => {
            if (typeof p != "boolean")
                p = !p.validate()
            
            return !c.validate() || p
        })

        if (err) return null

        const ret = {}
        inputs.forEach(input => ret[input.getAttribute('name')] = input.value)
        return ret
    }

    auth_listener(e)
    {
        const stage = e.data.stage
        const data = e.data.data

        if (stage == 'authenticated') { reload() }
        else if (stage == 'unauthenticated') {
            notify(
                new Notification(data.reason)
            )
        }
        else {
            this.shared.set('popup_data', data)
            const payload = parseJwt(data.token)
            set_stage(payload.token_type)
            redirect()
        }
    }


    async login() {
        const values = this.getValidatedCredentials()
        if (!values) return

        
        const res = await loading(API.login)(values)
        const data = res.body
        if (res.status == 200) {
            if ( data.stage == "authenticated" ) redirect(false)
            else {
                this.shared.set('popup_data', data)
                redirect()
            }
        }
        else {
            const error = get_errors();
            const error_msg = this.shadowRoot.querySelector('#credsLogin .error_msg')
            error_msg.textContent = error.detail
            error_msg.classList.add('show')
        }
    }

    html() {
        return /*html*/`
            <style>
                @import url('/themes.css');
                :host {
                    display: flex;
                    flex-direction: column;
                    width: 23rem;
                    max-width: 100%;
                }
                #credsLogin {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                input {
                    padding: .75rem;
                    font-size: 1.25rem;
                    border: 0;
                    border-radius: .25rem;
                    background: #94b1b1;
                    font-family: "Montserrat";
                }

                input:focus {
                    outline: 2px solid #f1f1e6a0;
                    outline-offset: 1px;
                }

                button {
                    cursor: pointer;
                    font-family: Montserrat
                }


                #credsLogin button {
                    padding: .75rem;
                    font-size: 1.25rem;
                    border: 0;
                    border-radius: .25rem;
                    background: var(--accent-color);
                    color: black;
                    transition: filter .3s ease;
                }

                #credsLogin button:hover {
                    filter: brightness(1.2);
                }

                #socialLogins {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                #socialLogins button {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    padding: .5rem;
                    border: 0;
                    border-radius: .25rem;
                    font-size: 1.25rem;
                    background: #f1f1e6;
                    box-shadow: 0 0 1rem rgba(0, 0, 0, .25);
                }

                #forgotPassword {
                    background: none;
                    color: silver;
                    text-decoration: underline;
                    font-size: 1.25rem;
                    border: 0;
                    margin-left: auto;
                    margin-top: .25rem;
                }

                .error_msg {
                    display: none;
                    margin-top: .25rem;
                    background: #ff7373;
                    color: black;
                    padding: 1rem;
                    border-radius: 12px;
                    text-align: center;
                }
                .error_msg.show {
                    display: initial;
                }
            </style>
            <h1 class="mb-1">Welcome Back</h1>
            <div id="socialLogins">
                <button id="google_login">
                    <svg height="2rem" viewBox="-3 0 262 262">
                        <path
                            d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                            fill="#4285F4" />
                        <path
                            d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                            fill="#34A853" />
                        <path
                            d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                            fill="#FBBC05" />
                        <path
                            d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                            fill="#EB4335" />
                    </svg>
                    <span>continue with <strong>Google</strong></span>
                </button>
                <button id="intra_login">
                    <svg height="2rem" viewBox="0 -200 960 960">
                        <polygon id="polygon5"
                            points="32,412.6 362.1,412.6 362.1,578 526.8,578 526.8,279.1 197.3,279.1 526.8,-51.1 362.1,-51.1   32,279.1 " />
                        <polygon id="polygon7" points="597.9,114.2 762.7,-51.1 597.9,-51.1 " />
                        <polygon id="polygon9"
                            points="762.7,114.2 597.9,279.1 597.9,443.9 762.7,443.9 762.7,279.1 928,114.2 928,-51.1 762.7,-51.1 " />
                        <polygon id="polygon11" points="928,279.1 762.7,443.9 928,443.9 " />
                    </svg>
                    <span>continue with <strong>42</strong></span>
                </button>
            </div>
            <div style="height: 72px; display: flex; align-items: center; gap: .5rem; color: silver; font-size: 1.25rem;">
                <div style="height: 1px; background: silver; opacity: 0.3; flex: 1;"></div>
                <span>Or</span>
                <div style="height: 1px; background: silver; opacity: 0.3; flex: 1;"></div>
            </div>
            <form id="credsLogin" name="login_form">
                <div class="error_msg"></div>
                <wc-input 
                    id="username" 
                    name="login" 
                    type="text" 
                    placeholder="username / email" 
                    constraints="required | min:5"> </wc-input>
                <wc-input 
                    id="password" 
                    name="password" 
                    type="password" 
                    placeholder="password"
                    autocomplete="current-password"
                    constraints="required | min:3 | max:10"></wc-input>
                <button 
                    type="submit" 
                    id="submit"
                >
                    login
                </button>
            </form>
            <wc-link data-to="password-reset" id="forgotPassword">Forgot password</wc-link>
        `
    }
}

export default Login