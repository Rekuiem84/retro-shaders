/**
 * Terminal : panneau de réglages
 *
 * Le module imite celle de lil-gui (add, addColor, addFolder, name, onChange)
 */

let uid = 0;

// Fonction utilisaire pour créer des éléments html (bouton, label, etc)
function el(tag, className = "", text = "") {
	const element = document.createElement(tag);
	if (className) element.className = className;
	if (text) element.textContent = text;
	return element;
}

class Controller {
	constructor(element, labelElement) {
		this.element = element;
		this.labelElement = labelElement;
		this.changeHandlers = [];
	}

	name(text) {
		this.labelElement.textContent = text;
		return this;
	}

	// Enregistre une fonction qui sera appelée quand une valeur change
	onChange(handler) {
		this.changeHandlers.push(handler);
		return this;
	}

	// exécute les fonctions enregistrées par le onChange
	emit(value) {
		this.changeHandlers.forEach((handler) => handler(value));
	}
}

// classe responsable de la création et de l'organisation des contrôles des valeurs
class Container {
	constructor(content) {
		// init avec l'élément htmo dans lequel ajouter les contrôles
		this.content = content;
	}

	/**
	 * Le type de contrôle dépend de la valeur de la propriété :
	 *  - fonction                    -> bouton
	 *  - booléen                     -> interrupteur
	 *  - nombre + objet d'options    -> liste déroulante
	 *  - nombre + min, max, step     -> slider
	 */
	add(object, property, ...args) {
		const value = object[property];

		if (typeof value === "function") return this._button(object, property);
		if (typeof value === "boolean") return this._toggle(object, property);
		if (typeof value === "number" && args[0] && typeof args[0] === "object") {
			return this._select(object, property, args[0]);
		}
		if (typeof value === "number")
			return this._slider(object, property, ...args);

		throw new Error(`Terminal : type non géré pour "${property}"`);
	}

	addColor(object, property) {
		const id = `t-control-${uid++}`;
		const row = el("div", "t-row t-row--color");
		const label = el("label", "t-label", property);
		label.htmlFor = id;
		const output = el("output", "t-value", object[property]);
		output.htmlFor = id;
		const input = el("input", "t-color");
		input.type = "color";
		input.id = id;
		input.value = object[property];
		row.append(label, output, input);
		this.content.append(row);

		const controller = new Controller(row, label);
		input.addEventListener("input", () => {
			object[property] = input.value;
			output.textContent = input.value;
			controller.emit(input.value);
		});
		return controller;
	}

	addFolder(title) {
		const details = el("details", "t-folder");
		details.open = true;
		const summary = el("summary", "t-folder__title", title);
		const content = el("div", "t-folder__content");
		details.append(summary, content);
		this.content.append(details);
		return new Folder(details, summary, content);
	}

	_button(object, property) {
		const row = el("div", "t-row");
		const button = el("button", "t-button");
		button.type = "button";
		const label = el("span", "t-label", property);
		button.append(label);
		row.append(button);
		this.content.append(row);

		const controller = new Controller(row, label);
		button.addEventListener("click", () => {
			object[property]();
			controller.emit();
		});
		return controller;
	}

	_toggle(object, property) {
		const row = el("div", "t-row");
		const button = el("button", "t-toggle");
		button.type = "button";
		button.setAttribute("role", "switch");
		const box = el("span", "t-toggle__box");
		const label = el("span", "t-label", property);
		button.append(box, label);
		row.append(button);
		this.content.append(row);

		const controller = new Controller(row, label);
		const render = () => {
			button.setAttribute("aria-checked", String(object[property]));
			box.textContent = object[property] ? "[x]" : "[ ]";
		};
		render();

		button.addEventListener("click", () => {
			object[property] = !object[property];
			render();
			controller.emit(object[property]);
		});
		return controller;
	}

	_slider(object, property, min = 0, max = 1, step = 0.01) {
		const id = `t-control-${uid++}`;
		const row = el("div", "t-row");
		const head = el("div", "t-row__head");
		const label = el("label", "t-label", property);
		label.htmlFor = id;
		const output = el("output", "t-value");
		output.htmlFor = id;
		head.append(label, output);

		const input = el("input", "t-slider");
		input.type = "range";
		input.id = id;
		input.min = min;
		input.max = max;
		input.step = step;
		input.value = object[property];

		row.append(head, input);
		this.content.append(row);

		const decimals = (String(step).split(".")[1] || "").length;
		const render = () => {
			const value = object[property];
			output.textContent = Number(value).toFixed(decimals);
			const ratio = (value - min) / (max - min);
			input.style.setProperty(
				"--fill",
				`${Math.min(1, Math.max(0, ratio)) * 100}%`,
			);
		};
		render();

		const controller = new Controller(row, label);
		input.addEventListener("input", () => {
			object[property] = parseFloat(input.value);
			render();
			controller.emit(object[property]);
		});
		input.addEventListener("pointerup", () => input.blur());
		return controller;
	}

	_select(object, property, options) {
		const entries = Object.entries(options);
		const id = `t-control-${uid++}`;
		const row = el("div", "t-row");
		const label = el("label", "t-label", property);
		label.htmlFor = id;

		const select = el("select", "t-select");
		select.id = id;
		entries.forEach(([optionLabel], index) => {
			const option = el("option", "", optionLabel);
			option.value = String(index);
			select.append(option);
		});
		const currentIndex = entries.findIndex(
			([, value]) => value === object[property],
		);
		select.value = String(Math.max(0, currentIndex));

		row.append(label, select);
		this.content.append(row);

		const controller = new Controller(row, label);
		select.addEventListener("change", () => {
			object[property] = entries[Number(select.value)][1];
			controller.emit(object[property]);
			select.blur();
		});
		return controller;
	}
}

class Folder extends Container {
	constructor(details, summary, content) {
		super(content);
		this.details = details;
		this.summary = summary;
	}

	open() {
		this.details.open = true;
		return this;
	}

	close() {
		this.details.open = false;
		return this;
	}
}

export class Terminal extends Container {
	constructor() {
		const root = document.querySelector("#terminal");
		const body = document.querySelector("#terminal-body");
		super(body);

		this.root = root;
		this.toggleButton = document.querySelector("#terminal-toggle");
		this.toggleButton.addEventListener("click", () => this.toggle());

		// H ouvre / ferme le terminal
		window.addEventListener("keydown", (event) => {
			if (event.repeat || event.ctrlKey || event.metaKey || event.altKey)
				return;
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLSelectElement
			) {
				return;
			}

			if (event.key?.toLowerCase() === "h") {
				this.toggle();
			} else if (event.key === "Escape" && this.isOpen) {
				this.setOpen(false);
			}
		});

		this.setOpen(true);
	}

	setOpen(open) {
		this.isOpen = open;
		this.root.classList.toggle("is-open", open);
		this.root.inert = !open; // les contrôles sortent de l'ordre de tabulation quand c'est fermé
		this.toggleButton.setAttribute("aria-expanded", String(open));
		this.toggleButton.textContent = open ? "[-] fermer" : ">_ ouvrir";
	}

	toggle() {
		this.setOpen(!this.isOpen);
	}
}
