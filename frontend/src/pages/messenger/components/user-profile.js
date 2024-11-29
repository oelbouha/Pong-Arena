import { create_element } from "../../../utils/index.js";

export class profile extends HTMLElement {
    constructor() {
        super();
        const shadowRoot = this.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = this.html()
        
        this.profiledata = {
            username: '',
            "name": "",
            "profilePic": "",
            "phoneNumber": "",
            "discription": "",
        }
    }
    
    connectedCallback() {
    }
    
    addUserInfo(data) {
        if (data) {
            this.profiledata = {
                ...this.profiledata,
                ...data
            }
            this.render()
        }
    }
    render() {
        if (!this.profiledata) return 

    
        const userImageElement = this.shadowRoot.querySelector('.user-image');
        const usernameElement = this.shadowRoot.querySelector('.user-name');

        userImageElement.src = this.profiledata.profilePic;
        usernameElement.textContent = this.profiledata.name;
        usernameElement.parentElement.append(create_element(/*html*/ `
            <wc-link data-to="/users/${this.profiledata.username}" class="bg-accent p-0-5 px-1 hover-brighten transition-med rounded-pill mt-1">go to profile</wc-link>
        `))
    }
    
    html() {
        return (
            /*html*/ `
            <style>
            @import url('/themes.css');
        
        :host {
            width: 100%;
            height: 100%;
            display: block;
        }
            
        .profile-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
            height: 100%;
            width: 100%;
            overflow-y: auto;
        }

        .profile-pic {
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #022f40;
            background-color: var(--glass-color);
            border-radius: 14px;
        }
        .user-image {
            width:  150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 1px solid #e0e0e0;
        }


        .profile-header {
            font-weight: bold;
        }

        #user-profile-info {
            color: white;
            background-color: var(--glass-color);
            border-radius: 14px;
        }

        </style>
        <div class="profile-container">
            <div class="profile-pic p-3">
                <img class="user-image" class="img-fluid" src="" alt="profile picture">
                <h4 class="user-name"></h4>
            </div>
        </div>
        `
        )
    }
}