MakeItRed = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],
	notifierID: null,

	init({id, version, rootURI}) {
		if (this.initialized) return;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
	},

	log(msg) {
		Zotero.debug("Make It Red: " + msg);
	},

	stylingReader(reader) {
		this.log(reader._title);
		let viewer = reader._iframeWindow.wrappedJSObject.PDFViewerApplication.pdfViewer.viewer;
		var elements = viewer.getElementsByClassName('textLayer');
		// 遍历这些元素并设置样式
		for (var i = 0; i < elements.length; i++) {
			elements[i].style.display = 'block';
			elements[i].style.backgroundColor = 'rgba(155,189,133,0.5)';
		}
	},

	addToWindow(window) {
		let doc = window.document;

		// Add a stylesheet to the main Zotero pane
		let link1 = doc.createElement('link');
		link1.id = 'make-it-red-stylesheet';
		link1.type = 'text/css';
		link1.rel = 'stylesheet';
		link1.href = this.rootURI + 'style.css';
		doc.documentElement.appendChild(link1);

		this.storeAddedElement(link1);

		// Use Fluent for localization
		window.MozXULElement.insertFTLIfNeeded("make-it-red.ftl");

		// Add menu option
		let menuitem = doc.createXULElement('menuitem');
		menuitem.id = 'make-it-green-instead';
		menuitem.setAttribute('type', 'checkbox');
		menuitem.setAttribute('data-l10n-id', 'make-it-red-green-instead');
		// MozMenuItem#checked is available in Zotero 7
		menuitem.addEventListener('command', () => {
			MakeItRed.toggleGreen(window, menuitem.checked);
		});
		doc.getElementById('menu_viewPopup').appendChild(menuitem);
		this.storeAddedElement(menuitem);
	},

	addToAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.addToWindow(win);
		}
	},

	storeAddedElement(elem) {
		if (!elem.id) {
			throw new Error("Element must have an id");
		}
		this.addedElementIDs.push(elem.id);
	},

	removeFromWindow(window) {
		var doc = window.document;
		// Remove all elements added to DOM
		for (let id of this.addedElementIDs) {
			doc.getElementById(id)?.remove();
		}
		doc.querySelector('[href="make-it-red.ftl"]').remove();
	},

	removeFromAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.removeFromWindow(win);
		}
	},

	toggleGreen(window, enabled) {
		window.document.documentElement
			.toggleAttribute('data-green-instead', enabled);
	},

	registerNotifier() {
		const callback = {
			notify: async (event, type, ids, extraData) => {
				if (event == "select" && type == "tab" && extraData[ids[0]].type == "reader") {
					var reader = Zotero.Reader.getByTabID(ids[0]);
					this.stylingReader(reader);
				}
			},
		};

		// Register the callback in Zotero as an item observer
		this.notifierID = Zotero.Notifier.registerObserver(callback, ["tab"]);
	},

	unregisterNotifier() {
		Zotero.Notifier.unregisterObserver(this.notifierID);
	},

	async main() {
		// Global properties are included automatically in Zotero 7
		var host = new URL('https://foo.com/path').host;
		this.log(`Host is ${host}`);

		// Retrieve a global pref
		this.log(`Intensity is ${Zotero.Prefs.get('extensions.make-it-red.intensity', true)}`);
	},
};
