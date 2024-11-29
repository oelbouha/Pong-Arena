import Component from "../../components/base.js";
import SVGs from "../../components/svgs.js"
import DATA, { set_authenticated_user } from "../../store.js";
import API from "../../networking.js"
import { addEventListener, get_validated_data } from "../../utils/index.js";



class UserSettings extends Component {
    constructor() {
        super()
        this.eventListeners = []
    }

    connectedCallback() {
        const pictureInput = this.shadowRoot.querySelector('#profilePicture input')
        const image = this.shadowRoot.querySelector('#profilePicture img')
        const bannerInput = this.shadowRoot.querySelector('#bannerPicture input')
        const banner = this.shadowRoot.querySelector('#bannerPicture img')
        const personalForm = this.shadowRoot.getElementById('personal')
        const bannerEditBtn = this.shadowRoot.getElementById('bannerEditBtn')
        const pictureEditBtn = this.shadowRoot.getElementById('pictureEditBtn')

        
        const onSubmit = e => {
            e.preventDefault()
            e.stopPropagation()
            const data = get_validated_data(personalForm)
            if (!data) return

            this.updateProfile(data)
        }
        this.eventListeners.forEach(l => l.unregister())
        this.eventListeners.push(
            addEventListener(pictureInput, 'change', () => {
                this.profile_picture = pictureInput.files[0]
                const url = URL.createObjectURL(this.profile_picture)
                image.src = url
            }),
            addEventListener(bannerInput, 'change', () => {
                this.profile_banner = bannerInput.files[0]
                const url = URL.createObjectURL(this.profile_banner)
                banner.src = url
            }),
            addEventListener(pictureEditBtn, 'click', () => pictureEditBtn.closest('label').click()),
            addEventListener(bannerEditBtn, 'click', () => bannerEditBtn.closest('label').click()),
            addEventListener(personalForm, 'submit', onSubmit),
            addEventListener(personalForm, 'send', onSubmit),
        )
    }

    async updateProfile(data) {
        if (this.profile_picture) data.profile_image = this.profile_picture
        if (this.profile_banner) data.profile_banner = this.profile_banner

        let me = DATA.get('auth_user')
        const res = await API.patch(API.urls.user(me.id), data)
        if (res.ok) {
            const user = {...me, ...res.body}
            set_authenticated_user(user)
            this.render()
            this.connectedCallback()
        }
    }

    get styles() {
        return /*css*/`
            @import url("/themes.css");
            :host {
                max-width: 100%;
            }
            .editPicture {
                --size: 2rem;
                position: absolute;
                width: var(--size);
                height: var(--size);
                background-color: black;
                border-radius: 50%;
                border: none;
                display: grid;
                padding: .35rem;
                transition: transform .6s ease, padding .6s ease, filter .6s ease;
            }
            #pictureEditBtn.editPicture {
                top: calc(84% - var(--size) / 2);
                left: calc(84% - var(--size) / 2);
            }
            #bannerEditBtn.editPicture {
                bottom: 1rem;
                right: 1rem;
            }
            label img {
                width: 12rem;
                height: 12rem;
                object-fit: cover;
                max-width: 100%;
                border-radius: 50%;
                transition: filter .6s ease;
                cursor: pointer;
            }
            label:hover img {
                filter: grayscale(1);
            }
            label:hover button {
                transform: scale(1.4);
                padding: .4rem;
                filter: invert(1);
            }
            #personal {
                width: 30rem;
                max-width: min(100%, 30rem);
            }
        `
    }

    html() {
        const me = DATA.get('auth_user')
        return /*html*/`
            <style>
                ${this.styles}
            </style>
            <div id="userAvatar" class="column gap-0-5 align-center">
                <div class="w-100 h-10r">
                    <label id="bannerPicture" class="picture_input w-100 relative">
                        <input type="file" id="bannerPictureInput" class="hidden">
                        <img src="${me.profile_banner}" alt="${me.name}'s banner" class="w-100 img-cover h-17r rounded-1">
                        <button class="editPicture" id="bannerEditBtn">
                            ${ SVGs.pen({width: '100%'})}
                        </button>
                    </label>
                </div>
                <label id="profilePicture"  class="picture_input grid relative h-12r w-12r">
                    <input type="file" class="hidden" id="profilePictureInput">
                    <img
                        class="h-100 w-100 img-cover bg-accent"
                        src="${me.profile_image}"
                        alt="${me.name}'s profile picture" />
                    <button class="editPicture" id="pictureEditBtn" type="button">
                        ${ SVGs.pen({width: '100%'})}
                    </button>
                </label>
                <h3 class="fw-400 fs-1-5"> ${ me.name } </h3>
                <h4 id="email" class="fw-300 fs-1 lh-1"> ${ me.email } </h4>
                <form id="personal" class="column gap-0-5 mt-1">
                    <div class="column gap-0-5">
                        <div class="capitalize">username</div>
                        <wc-input
                            name="username"
                            type="text"
                            value="${me.username}"
                            placeholder="Enter Value"
                            constraints="min:5"
                            data-input-class="bg-silver"
                        ></wc-input>
                    </div>
                    <div class="column gap-0-5">
                        <div class="capitalize">first name</div>
                        <wc-input
                            name="first_name"
                            type="text"
                            value="${me.first_name}"
                            placeholder="Enter Value"
                            constraints="min:5"
                            data-input-class="bg-silver"
                        ></wc-input>
                    </div>
                    <div class="column gap-0-5">
                        <div class="capitalize">last name</div>
                        <wc-input
                            name="last_name"
                            type="text"
                            value="${me.last_name}"
                            placeholder="Enter Value"
                            constraints="min:5"
                            data-input-class="bg-silver"
                        ></wc-input>
                    </div>
                    <button class="action-btn mt-0-5" type="submit">update profile</button>
                </form>
            </div>
        `
    }
}
customElements.define('wc-user-settings', UserSettings)