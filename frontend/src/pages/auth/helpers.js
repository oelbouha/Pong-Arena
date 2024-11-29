import Component from "../../components/base.js";


class LoadingOverlay extends Component {
    html() {
        return /*html*/`
            <style>
                #loadingOverlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: rgba(0, 0, 0, 0.445);
                    backdrop-filter: blur(6px);
                    z-index: 10000;
                }
            </style>
            <div id="loadingOverlay">
                <svg width="3rem" viewBox="0 0 16 16" fill="none">
                    <g fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd">
                        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"></path>
                        <path  d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z" fill="var(--accent-color)">
                            <animateTransform
                                attributeName="transform"
                                begin="0s"
                                dur="1.25s"
                                type="rotate"
                                from="0 8 8"
                                to="360 8 8"
                                repeatCount="indefinite" />
                        </path>
                    </g>
                </svg>
            </div>
        `
    }
}
customElements.define('loading-overlay', LoadingOverlay)
const loadingOverlay = document.createElement('loading-overlay')

export function loading(f) {
    return async function() {
        const t0 = Date.now()
        loadingOverlay.remove()
        document.body.append(loadingOverlay)

        const res = await f(...arguments)

        const t1 = Date.now()
        if (t1 - t0 < 500)
            await new Promise(r => setTimeout(r, 500));
        loadingOverlay.remove()

        return res
    }
}


export function get_validated_data(root)
{
    const inputs = Array.from(root.querySelectorAll('wc-input'))
    inputs.push({validate: () => true})

    const err = inputs.reduce((p, c) => {
        if (typeof p != "boolean")
            p = !p.validate()
        
        return !c.validate() || p
    })

    if (err) return null
    
    inputs.pop()
    const ret = {}
    inputs.forEach(input => { if(input.value) ret[input.getAttribute('name')] = input.value})
    return ret
}