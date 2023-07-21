import * as vscode from 'vscode';
import { createMarker } from './util';
import { Action, MarkerData, MessagePayload, WORKSPACE_STORAGE_KEY } from './definition';

export function activate(context: vscode.ExtensionContext) {
	context.workspaceState.update(WORKSPACE_STORAGE_KEY, null);
	const provider = new TrackerPanelWebviewProvider(context.extensionUri, context.workspaceState);

	vscode.window.registerWebviewViewProvider('markItView', provider);
	vscode.commands.registerCommand('markItCommand.mark', () => {
		provider.handleMark();
	});
}

export function deactivate() {
}

interface StorageData {
	markers: MarkerData[];
	activeMarkerId: string | null;
}

class TrackerPanelWebviewProvider implements vscode.WebviewViewProvider {
	private extesionUri: vscode.Uri;
	private storage: vscode.Memento;
	private visible: boolean = false;
	private view: vscode.WebviewView | undefined = undefined;
	private markers: MarkerData[] = [];
	private activeMarker: MarkerData | null = null;

	constructor(extensionPath: vscode.Uri, storage: vscode.Memento) {
		this.extesionUri = extensionPath;
		this.storage = storage;

		const previousData = this.storage.get<StorageData>(WORKSPACE_STORAGE_KEY);
		if (previousData) {
			this.markers = previousData.markers || [];
			if (previousData.activeMarkerId) {
				this.activeMarker = this.markers.find(marker => marker.id === previousData.activeMarkerId) || null;
			}
			if (!this.activeMarker) {
				this.activeMarker = this.markers[this.markers.length - 1] || null;
			}
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		this.view = webviewView;
		webviewView.webview.options = {
			localResourceRoots: [
				vscode.Uri.joinPath(this.extesionUri, 'dist'),
				vscode.Uri.joinPath(this.extesionUri, 'assets')
			],
			enableScripts: true,
		};
		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, this.extesionUri);
		this.initEvent();
	}

	openDocument(marker: MarkerData) {
		vscode.window.showTextDocument(
			vscode.Uri.file(marker.fileName),
			{
				selection: new vscode.Range(marker.start, marker.end)
			}
		);
	}

	findMarker(markerId: string) {
		return this.markers.find(marker => marker.id === markerId);
	}

	_removeMarker(markerId: string) {
		const marker = this.findMarker(markerId);
		if (!marker) {
			return false;
		}
		const index = this.markers.indexOf(marker);
		if (index !== -1) {
			this.markers.splice(index, 1);
			if (marker.parent) {
				const parentMarker = this.findMarker(marker.parent);
				if (parentMarker && parentMarker.children && parentMarker.children.includes(markerId)) {
					parentMarker.children = parentMarker.children.filter(childId => childId !== markerId);
				}
			}
			if (marker.children) {
				marker.children.forEach(childId => {
					this.removeMarker(childId);
				});
			}
			this.syncMarkerState();
		}
		return true;
	}

	removeMarker(markerId: string) {
		const res = this._removeMarker(markerId);
		if (res) {
			this.send(Action.removeMarker, markerId);
		}
	}

	_activateMarker(markerId: string) {
		const marker = this.findMarker(markerId);
		if (!marker) {
			return false;
		}
		this.activeMarker = marker;
		this.syncMarkerState();
		return true;
	}
	activateMarker(markerId: string) {
		const res = this._activateMarker(markerId);
		if (res) {
			if (this.activeMarker) {
				this.openDocument(this.activeMarker);
			}
			this.send(Action.activateMarker, markerId);
		}
	}

	initEvent() {
		if (!this.view) {
			return;
		}
		this.view.onDidChangeVisibility(() => {
			this.handleVisibilityChangedAction();
		});
		this.view.webview.onDidReceiveMessage(data => {
			switch (data.action) {
				case Action.init:
					return this.handleInitAction();
				case Action.requestRemoveMaker:
					return this.handleRemoveMarker(data.data);
				case Action.requestActivateMaker:
					return this.handleActivateMaker(data.data);
			}
		});
	}

	handleVisibilityChangedAction() {
		if (!this.view) {
			return;
		}
		if (this.view.visible === false) {
			this.visible = this.view.visible;
		}
	}
	handleInitAction() {
		if (!this.view) {
			return;
		}
		this.initWebview();
		this.visible = true;
	}

	handleMark() {
		if (!this.view) {
			return;
		}
		const { activeTextEditor } = vscode.window;
		if (!activeTextEditor) {
			return;
		}
		const { start, end } = activeTextEditor.selection;
		const content = activeTextEditor.document.getText(new vscode.Range(start, end));
		
		this.addMarker(activeTextEditor.document.fileName, start, end, content);
	}

	handleRemoveMarker(markerId: string) {
		this.removeMarker(markerId);
	}

	handleActivateMaker(markerId: string) {
		this.activateMarker(markerId);
	}

	initWebview() {
		this.send(Action.init, {
			markers: this.markers,
			activeMarkerId: this.activeMarker?.id || null
		});
	}

	_addMarker(fileName: string, start: vscode.Position, end: vscode.Position, content: string) {
		const newMarker = createMarker(fileName, start, end, content);
		if (this.markers.length === 0) {
			newMarker.first = true;
		} else if (this.activeMarker) {
			newMarker.parent = this.activeMarker.id;
			if (!this.activeMarker.children) {
				this.activeMarker.children = [];
			}
			this.activeMarker.children.push(newMarker.id);
		}
		this.activeMarker = newMarker;
		this.markers.push(newMarker);
		this.syncMarkerState();
		return newMarker;
	}

	addMarker(fileName: string, start: vscode.Position, end: vscode.Position, content: string) {
		const newMarker = this._addMarker(fileName, start, end, content);
		this.send(Action.addMarker, newMarker);
	}

	syncMarkerState() {
		this.storage.update(WORKSPACE_STORAGE_KEY, {
			markers: this.markers,
			activeMarkerId: this.activeMarker ? this.activeMarker.id : null,
		});
	}

	send(action: Action, data: any) {
		if (!this.view) {
			return;
		}
		const payload: MessagePayload = {
			action,
			data,
		};
		this.view.webview.postMessage(payload);
	}

	getHtmlForWebview(webview: vscode.Webview, extensionPath: vscode.Uri) {
		const scriptPathOnDisk = vscode.Uri.joinPath(extensionPath, 'dist', 'webview.js');
		const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

		const styleResetPath = vscode.Uri.joinPath(extensionPath, 'assets', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(extensionPath, 'assets', 'main.css');
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
				<title>Mark It</title>
			</head>
			<body>
				<div id="app"></div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}
