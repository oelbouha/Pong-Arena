import Component from "../../components/base.js";

import "./user.js"
import "./security.js"




class Settings extends Component {



    html() {
        return /*html*/`
            <style>
                @import url("/themes.css");
                :host {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    font-family: "Montserrat";
                    align-items: stretch;
                }
            </style>
            <wc-user-settings class="grow basis-0 p-1"></wc-user-settings>
            <wc-security class="grow basis-0 p-1"></wc-security>
            

        `
    }
}

customElements.define('wc-settings', Settings)