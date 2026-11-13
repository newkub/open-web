import { render } from "solid-js/web";
import { RouterApp } from "./router";

const root = document.getElementById("root");
if (root) {
	render(() => <RouterApp />, root);
}
