import {
	createHashHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/solid-router";
import App from "./App";

const rootRoute = createRootRoute({
	component: App,
});

const router = createRouter({
	routeTree: rootRoute,
	history: createHashHistory(),
});

export function RouterApp() {
	return <RouterProvider router={router} />;
}
