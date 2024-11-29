import Route from "../../router/route.js"
import SVGs from "../../components/svgs.js"
import { get_auth_stage, get_errors, get_oauth_url, signup as raw_signup, reload, set_stage } from "../../networking.js"
import { addEventListener, notify, parseJwt } from "../../utils/index.js"
import { get_redirection_uri, routes } from "../../config.js"
import { navigate_to, oauth_popup, redirect } from "../../router/utils.js"
import { loading } from "./helpers.js"
import { Notification } from "../Notifier.js"
import Notifications from "../../components/Notifications.js"

async function register(comp) {

}

const signup = loading(raw_signup)

class SignUp extends Route {

    constructor()
    {
        super()
        this.eventListeners = []

        this.auth_listener = this.auth_listener.bind(this)
    }

    connectedCallback()
    {
        const form = this.shadowRoot.querySelector('.signupForm')
        

        form.reset()
        
        this.eventListeners.push( addEventListener(form, 'submit', e => {
            e.preventDefault()
            e.stopPropagation()
            this.register()
        }) )
        this.eventListeners.push( addEventListener(form, 'send', e => {
            e.stopPropagation()
            this.register()
        }) )

        const socialSignup = this.shadowRoot.getElementById('socialSignup')
        this.eventListeners.push( 
            addEventListener(socialSignup, 'click', async (e) => {
                const closest = e.target.closest('button')
                if (!closest) return

                const id = closest.id
                const url = await get_oauth_url(id)
                if (url)
                {
                    if (! this.channel) {
                        this.channel = new BroadcastChannel('auth')
                        this.channel.addEventListener('message', this.auth_listener)
                    }
                    
                    oauth_popup(url)
                }
                else notify(new Notifications('Auth Provider is not supported'))
            })
        )
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
            const payload = parseJwt(data.token)
            this.shared.set('popup_data', data)
            set_stage(payload.token_type)
            redirect(false)
        }
        
    }

    async register() {
        const data = this.getValidatedData()
        const registered = await signup(data)

        if (registered) {
            const auth_stage = get_auth_stage()
            const path = get_redirection_uri(auth_stage)
            navigate_to(path, false)
            return
        }

        const errors = get_errors()
        const inputs = Array.from(this.shadowRoot.querySelectorAll('wc-input'))
        inputs.forEach(input => {
            const field = input.getAttribute('name')
            if ( ! errors[field] ) return
            const errors_arr = errors[field].map(m => m != 'This field must be unique.'? m : `A user with that ${field} already exists.`)
            const message = errors_arr.map(s => `• ${s}\n`).reduce((p, c) => p + c)
            input.displayError(message)
        })
    }

    getValidatedData()
    {
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

    html() {
        return /*html*/`
            <style>
                :host {
                    display: flex;
                    flex-direction: column;
                    width: 23rem;
                    max-width: 100%;
                }

                .signupForm {
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
                button {
                    cursor: pointer;
                    font-family: Montserrat
                }


                .signupForm button {
                    padding: .75rem;
                    font-size: 1.25rem;
                    border: 0;
                    border-radius: .25rem;
                    background: var(--accent-color);
                    color: black;
                    transition: filter .3s ease;
                }

                .signupForm button:hover {
                    filter: brightness(1.2);
                }

                #socialSignup {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                #socialSignup button {
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
                    /* #95b0b1; */
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

                .column {
                    display: flex;
                    flex-direction: column;
                }
                .error_msg {
                    display: none;
                    margin-top: .25rem;
                    color: #ff7373;
                    font-size: .8rem;
                }
                .column.error .error_msg {
                    display: initial;
                }
                h3, h4 { margin: 0;}
                #second_step wc-input {
                    margin-bottom: .5rem;
                }
                #second_step form {
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.15);
                }
                #user_preview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                #profile_picture {
                    position: relative;
                    margin-bottom: .25rem;
                }
                #edit_picture {
                    position: absolute;
                    --size: 2rem;
                    width: var(--size);
                    height: var(--size);
                    top: calc(84% - var(--size) / 2);
                    left: calc(84% - var(--size) / 2);
                    background-color: black;
                    border-radius: 50%;
                    border: none;
                    display: grid;
                    padding: .35rem;
                    transition: transform .6s ease, padding .6s ease, filter .6s ease;
                }
                #user_preview img {
                    width: 12rem;
                    max-width: 100%;
                    border-radius: 50%;
                    transition: filter .6s ease;
                    cursor: pointer;
                }
                #profile_picture:hover img {
                    filter: grayscale(1);
                }
                #profile_picture:hover button {
                    transform: scale(1.4);
                    padding: .4rem;
                    filter: invert(1);
                }
                .input_group {
                    display: flex; /*flex;*/
                    flex-direction: column;
                    align-self: stretch;
                    margin-top: 1rem;
                }
                #email {
                    font-weight: 300;
                    font-size: .9rem;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                #display_name {
                    font-size: 1.75rem;
                    font-weight: 600;
                    display: flex;
                }
                #display_name button {
                    display: grid;
                    border: none;
                    background: #0e0e19;
                    border-radius: 50%;
                    justify-content: center;
                    align-items: center;
                    filter: invert(1);
                    margin-left: 1rem;
                    padding: 4px;
                    align-self: center;
                }
            </style>
            <h1>Sign up</h1>
            <div id="first_step">
                <div id="socialSignup">
                    <button id="google_signup">
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
                    <button id="intra_signup">
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
                <form class="signupForm">
                    <wc-input
                        name="username" 
                        type="text" 
                        placeholder="Username" 
                        constraints="required | min:5 | include:\\w\.- | start_with:[a-zA-Z]"></wc-input>
                    <wc-input
                        name="first_name" 
                        type="text" 
                        placeholder="First Name" 
                        constraints="required | min:3 | include: a-zA-Z\- | start_with:[a-zA-Z]"></wc-input>
                    <wc-input
                        name="last_name" 
                        type="text" 
                        placeholder="Last Name" 
                        constraints="required | min:3 | include: a-zA-Z\- | start_with:[a-zA-Z]"></wc-input>
                    <wc-input
                        name="email" 
                        type="email" 
                        placeholder="Email" 
                        constraints="required | email"></wc-input>
                    <wc-input 
                        name="password" 
                        type="password" 
                        placeholder="Password" 
                        constraints="required | min:8"></wc-input>
                    <button type="submit">sign up</button>
                </form>
            </div>
        `
    }
}

export default SignUp