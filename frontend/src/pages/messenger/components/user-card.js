

export class card extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode:'open'});
        
        this.container = document.createElement('div')
        this.container.innerHTML = this.html()
        this.shadowRoot.appendChild(this.container)

        this.data = {
            "key": "",
            "value": "",
            "svg": ""
        }
    }
    
    connectedCallback() {
    }
    
    addUserInfo(key, value, svg) {
        this.data.key = key
        this.data.value = value
        this.data.svg = svg

        this.render()
    }
    render() {
        if (!this.data) return 
        
        const icon = this.shadowRoot.querySelector('.card-icon');
        icon.src = this.data.svg;

        const header = this.shadowRoot.querySelector('.card-header');
        header.textContent = this.data.key;

        const body = this.shadowRoot.querySelector('#card-body');
        body.textContent = this.data.value
    }
    
    static get observedAttributes() {
        return ['username', 'profile-pic', 'svg-path'];
    }
    

    html() {
        return (
        /*html*/ `
        <style>
            @import url('https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css');
    
            :host {
                width: 100%;
                height: 100%;
            }
            
            #card-container {
                display: flex;
                flex-direction: column;
            }
            
            .card-icon {
                margin-top: 5px;
                width: 15px;
                height: 15px;
            }
            
            .body-container {
                display: flex;
                flex-direction: row;
                gap: 3px;
            }
    
            .card-header {
                font-weight: bold;
            }
    
        </style>
        <div id="card-container">
            <div class="card-header">
                <p> Header </p>
            </div>
            <div class="body-container">
                <img class="card-icon" src="/assets/list.svg" alt="svg">
                <p id="card-body">this is the body </p>
            </div>
        </div>
        `
        )
    }
}