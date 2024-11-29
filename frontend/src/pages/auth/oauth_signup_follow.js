import Route from "../../router/route.js"
import SVGs from "../../components/svgs.js"
import { get_auth_stage, get_errors, get_payload, oauth_follow_up, post, signup as raw_signup, urls } from "../../networking.js"
import { addEventListener, parseJwt } from "../../utils/index.js"
import { get_redirection_uri } from "../../config.js"
import { navigate_to, redirect } from "../../router/utils.js"
import { loading } from "./helpers.js"


const signup = loading(raw_signup)

class OAuthFollowUp extends Route {

    constructor()
    {
        super()
        this.eventListeners = []

        this.displayNameInputs = this.shadowRoot.getElementById('display_name_inputs')
        this.passwordInput = this.shadowRoot.getElementById('password_input')
    }

    connectedCallback()
    {
        if (!super.connectedCallback()) return

        const picture_input = this.shadowRoot.getElementById('profile_picture_input')
        const editName = this.shadowRoot.querySelector('#display_name button')
        const addPwd = this.shadowRoot.querySelector('#setupPwd')
        const form = this.shadowRoot.querySelector('.signupForm')

        this.eventListeners.push(
            addEventListener(picture_input, 'change', async () => {
                const img = this.shadowRoot.querySelector('#profile_picture img')
                this.profile_picture = picture_input.files[0]

                const url = URL.createObjectURL(this.profile_picture)
                img.src = url
            }),
            addEventListener(editName, 'click', () => {
                editName.parentElement.replaceWith(
                    this.displayNameInputs
                )
            }),
            addEventListener(addPwd, 'click', () => {
                addPwd.replaceWith(
                    this.passwordInput
                )
            }),
            addEventListener(form, 'submit', e => {
                e.preventDefault()
                e.stopPropagation()
                this.register()
            }),
            addEventListener(form, 'send', e => {
                e.stopPropagation()
                this.register()
            })
        )

        this.preFillInputs()
        this.hideEditingInputs()
    }
    disconnectedCallback() {
        this.eventListeners.forEach(l => l.unregister())
    }

    preFillInputs() {
        const data = this.shared.get('popup_data')
        const payload = parseJwt(data.token)

        const picture = this.shadowRoot.querySelector('#profile_picture img')
        picture.src = payload.picture

        const displayName = this.shadowRoot.querySelector('#display_name span')
        displayName.textContent = `${payload.first_name} ${payload.last_name}`

        const email = this.shadowRoot.querySelector('#email')
        email.textContent = payload.email

        const username = this.shadowRoot.getElementById('username')
        if (payload.username) {
            username.setAttribute('value', payload.username)
            
            const fn = () => {
                if (username.displayError) {
                    username.validate()
                    username.displayError('a user with this username already exist.')
                }
                else setTimeout(fn, 200)
            }
            fn()
        }
        else {
            username.setAttribute('value', '')
            const fn = () => {
                if (username.displayError)
                    username.validate()
                else setTimeout(fn, 200)
            }
            fn()
        }


        this.displayNameInputs.firstElementChild.setAttribute('placeholder', payload.first_name)
        this.displayNameInputs.children[1].setAttribute('placeholder', payload.last_name)
    }
    hideEditingInputs() {
        this.displayNameInputs.remove()
        this.passwordInput.remove()
    }

    async register() {
        const data = this.getValidatedData()
        const token = this.shared.get('popup_data').token
        
        if (this.profile_picture) data.picture = this.profile_picture
        
        const status = await oauth_follow_up(data, token)

        if (status == 200) {
            redirect(false)
            return
        }
        else if (status == 403) redirect()

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
        inputs.push({validate: () => true})

        const err = inputs.reduce((p, c) => {
            if (typeof p != "boolean")
                p = !p.validate()
            
            return !c.validate() || p
        })

        inputs.pop()
        if (err) return null

        const ret = {}
        inputs.forEach(input => { if(input.value) ret[input.getAttribute('name')] = input.value})
        return ret
    }

    shouldRedirect() {
        return get_auth_stage() != 'oauth-follow'
    }
    get redirectTo() {
        return '/auth/signup/'
    }

    get styles() {
        return /*css*/ `
            :host {
                display: flex;
                flex-direction: column;
                width: 24rem;
                max-width: 100%;
            }

            button {
                cursor: pointer;
                font-family: Montserrat
            }
            .signupForm {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }
            .signupForm button {
                padding: .75rem;
                font-size: 1.25rem;
                border: 0;
                border-radius: .25rem;
                background: var(--accent-color);
                color: black;
            }
            button {
                transition: filter .3s ease;
            }
            button:hover {
                filter: brightness(1.2);
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
                height: 12rem;
                object-fit: cover;
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
            #profile_picture_input {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                opacity: 0;
                cursor: pointer;
            }

            #setupPwd {
                display: flex;
                gap: 1rem;
                align-items: center;
                padding: 2px 16px 2px 20px;
                border-radius: 5rem;
                border: none;
                margin-top: .5rem;
                background: #f1f1e6;
                font-weight: 500;
            }
        `
    }
    html() {
        return /*html*/`
            <style> ${this.styles} </style>
            <h1>Sign up</h1>
            <div id="second_step">
                <div id="user_preview">
                    <div id="profile_picture">
                        <img onerror="this.src = '/assets/default-avatar.avif'" src="https://pics.craiyon.com/2023-11-26/oMNPpACzTtO5OVERUZwh3Q.webp" alt="profile picture">
                        <button id="edit_picture">
                            ${ SVGs.pen({width: '100%'})}
                        </button>
                        <input type="file" id="profile_picture_input">
                    </div>
                    <h4 id="email">salmi19971@gmail.com</h4>
                    <div id="display_name_inputs" class="input_group">
                        <wc-input 
                            name="first_name" 
                            type="text" 
                            placeholder="First Name" 
                            constraints="min:5 | include:\\w\.- | start_with:[a-zA-Z]"
                        ></wc-input>
                        <wc-input 
                            name="last_name" 
                            type="text" 
                            placeholder="Last Name" 
                            constraints="min:5 | include:\\w\.- | start_with:[a-zA-Z]"
                        ></wc-input>
                    </div>
                        
                    <div id="password_input" class="input_group">
                        <wc-input 
                            name="password" 
                            type="password" 
                            placeholder="Password" 
                            constraints="min:5 | include:\\w\.- | start_with:[a-zA-Z]"
                        ></wc-input>
                    </div>
                    
                    <h3 id="display_name">
                        <span>Youssef Salmi</span>
                        <button>
                            ${ SVGs.pen({width: '1.25rem'})}
                        </button>
                    </h3>
                    <button id="setupPwd">
                        Set up password
                        <svg width="1.5rem" viewBox="0 0 24 24" fill="none">
                            <path d="M18.9771 14.7904C21.6743 12.0932 21.6743 7.72013 18.9771 5.02291C16.2799 2.3257 11.9068 2.3257 9.20961 5.02291C7.41866 6.81385 6.8169 9.34366 7.40432 11.6311C7.49906 12 7.41492 12.399 7.14558 12.6684L3.43349 16.3804C3.11558 16.6984 2.95941 17.1435 3.00906 17.5904L3.24113 19.679C3.26587 19.9017 3.36566 20.1093 3.52408 20.2677L3.73229 20.4759C3.89072 20.6343 4.09834 20.7341 4.32101 20.7589L6.4096 20.9909C6.85645 21.0406 7.30164 20.8844 7.61956 20.5665L8.32958 19.8565L9.39026 18.7958L11.3319 16.8541C11.6013 16.5848 12 16.5009 12.3689 16.5957C14.6563 17.1831 17.1861 16.5813 18.9771 14.7904Z" fill="black"/>
                            <path d="M15.4142 8.58579C14.6332 7.80474 13.3668 7.80474 12.5858 8.58579C11.8047 9.36683 11.8047 10.6332 12.5858 11.4142C13.3668 12.1953 14.6332 12.1953 15.4142 11.4142C16.1953 10.6332 16.1953 9.36683 15.4142 8.58579Z" fill="white" opacity="0.6"/>
                            <path d="M6.58295 18.1294L8.3291 19.8565L9.38977 18.7958L7.63776 17.063C7.34326 16.7717 6.86839 16.7743 6.57711 17.0688C6.28584 17.3633 6.28845 17.8382 6.58295 18.1294Z" fill="white" opacity="0.6"/>
                        </svg>
                    </button>
                </div>
                <form class="signupForm">
                    <p style="margin: 0;">
                        Please Choose a username
                    </p>
                    <wc-input 
                        id="username" 
                        name="username" 
                        type="text" 
                        placeholder="username" 
                        constraints="required | min:5 | include:\\w\.- | start_with:[a-zA-Z]"
                    ></wc-input>
                    <button type="submit">continue</button>
                </form>
            </div>
        `
    }
}

export default OAuthFollowUp