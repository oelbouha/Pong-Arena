import { Router, Route, Link } from "./router/index.js";
import Auth from "./pages/auth/index.js"
import Template from "./pages/template.js";
import "./components/index.js"
import "./pages/settings/index.js"
import "./pages/profile/index.js"
import "./pages/tournament/index.js"
import "./pages/games/index.js"
import "./pages/messenger/index.js"


customElements.define('wc-router', Router);
customElements.define('wc-route', Route);
customElements.define('wc-link', Link);
customElements.define('wc-auth', Auth)
customElements.define('wc-template', Template)