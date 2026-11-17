import restart from "vite-plugin-restart";
import glsl from "vite-plugin-glsl";

export default {
	base: process.env.NODE_ENV === "production" ? "/retro-shaders/" : "/",
	root: "src/",
	publicDir: "../static/",

	server: {
		host: true,
		open: !("SANDBOX_URL" in process.env || "CODESANDBOX_HOST" in process.env),

		watch: {
			useFsEvents: false,
		},
	},

	build: {
		outDir: "../dist",
		emptyOutDir: true,
		sourcemap: true,
		target: "esnext",
	},

	plugins: [
		restart({
			restart: ["../static/**"],
		}),
		glsl(),
	],
};
