
// const templates = {}

export default (html, elem) => {

    // if (!templates[elem.nodeName]) {
        const template = document.createElement('template');
        template.innerHTML = html;
        
        // templates[elem.nodeName] = document.adoptNode(template.content)
    // }

    // let fragment = templates[elem.nodeName]
    let fragment = document.adoptNode(template.content)
  
    const shadowRoot = elem.attachShadow({mode: `open`});
    shadowRoot.appendChild(fragment);

    return shadowRoot;
}