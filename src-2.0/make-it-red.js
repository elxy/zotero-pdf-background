MakeItRed = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],
	notifierID: null,
	styleID: 'pdf-background',

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

	getStyleHTMLFromReader(reader) {
		let viewer = reader._iframeWindow.wrappedJSObject.PDFViewerApplication.pdfViewer.viewer;
		// 获取父元素的所有子元素
		var children = viewer.childNodes;
		// 遍历子元素
		var finded = [];
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			// 检查子元素的ID
			if (child.id === this.styleID) {
				finded.push(child);
			}
		}
		return finded;
	},

	stylingReader(reader, enabled) {
		let styleChildren = this.getStyleHTMLFromReader(reader);

		if (enabled && styleChildren.length) {
			this.log(reader.tabID + " is already styled, no need to add style HTML");
			return;
		}
		if (!enabled && !styleChildren.length) {
			this.log(reader.tabID + " is not styled, no need to remove style HTML");
			return;
		}

		let viewer = reader._iframeWindow.wrappedJSObject.PDFViewerApplication.pdfViewer.viewer;
		if (enabled) {
			this.log(reader.tabID + " is not styled, adding style HTML");
			let color = Zotero.Prefs.get('pdf-background.style.background-color', true);
			let css = '.textLayer { display: block; background-color: ' + color + '; }';
			let styleHTML = '<style type="text/css" id=' + this.styleID + '>' + css + '</style>';
			viewer.insertAdjacentHTML('beforeend', styleHTML)
		} else {
			this.log(reader.tabID + " is styled, removing style HTML");
			for (let child of styleChildren) {
				viewer.removeChild(child);
			}
		}
	},

	removeStyleHTMLFromReader(reader) {
		this.log("Remove style HTML from " + reader.tabID);

		if (!this.addedReaderIDs.get(reader.tabID)) {
			this.log("No need to remove style HTML");
			return;
		}

		let viewer = reader._iframeWindow.wrappedJSObject.PDFViewerApplication.pdfViewer.viewer;
		// 获取父元素的所有子元素
		var children = viewer.childNodes;
		// 遍历子元素
		for (var i = 0; i < children.length; i++) {
			var child = children[i];
			// 检查子元素的ID
			if (child.id === this.styleID) {
				viewer.removeChild(child);
			}
		}
	},

	addToWindow(window) {
		let doc = window.document;

		// Use Fluent for localization
		window.MozXULElement.insertFTLIfNeeded("make-it-red.ftl");

		// Add menu option
		var menuitem = doc.createXULElement('menuitem');
		menuitem.id = 'pdf-background-enabled';
		menuitem.setAttribute('type', 'checkbox');
		menuitem.setAttribute('data-l10n-id', 'pdf-background-enabled');
		let enabled = Zotero.Prefs.get('pdf-background.style.enabled', true);
		menuitem.setAttribute('checked', enabled ? 'true' : 'false');
		// MozMenuItem#checked is available in Zotero 7
		menuitem.addEventListener('command', () => {
			let checked = menuitem.getAttribute('checked');
			this.log('checked? ' + checked);
			MakeItRed.toggleStyling(window, checked);
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

		for (let reader of Zotero.Reader._readers) {
			this.removeStyleHTMLFromReader(reader);
		}
	},

	toggleStyling(window, enabled) {
		this.log('toggleStyling ' + enabled);
		Zotero.Prefs.set('pdf-background.style.enabled', enabled, true);
		for (let reader of Zotero.Reader._readers) {
			this.stylingReader(reader, enabled);
		}
	},

	registerNotifier() {
		const callback = {
			notify: async (event, type, ids, extraData) => {
				if (event == "select" && type == "tab" && extraData[ids[0]].type == "reader") {
					var reader = Zotero.Reader.getByTabID(ids[0]);
					var enabled = Zotero.Prefs.get('pdf-background.style.enabled', true);
					this.log('notify ' + enabled);
					this.stylingReader(reader, enabled);
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
		// Retrieve a global pref
		this.log(`enabled is ${Zotero.Prefs.get('pdf-background.style.enabled', true)}`);
		this.log(`Background color is ${Zotero.Prefs.get('pdf-background.style.background-color', true)}`);
	},
};
