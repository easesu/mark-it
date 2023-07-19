import * as vscode from 'vscode';
import { createMarker } from './util';
import { Action, Marker, MessagePayload, WORKSPACE_STORAGE_KEY } from './definition';

export function activate(context: vscode.ExtensionContext) {
	const provider = new TrackerPanelWebviewProvider(context.extensionUri, context.workspaceState);

	vscode.window.registerWebviewViewProvider('markItView', provider);
	vscode.commands.registerCommand('markItCommand.mark', () => {
		provider.handleMark();
	});
}

export function deactivate() {
}

class TrackerPanelWebviewProvider implements vscode.WebviewViewProvider {
	private extesionUri: vscode.Uri;
	private storage: vscode.Memento;
	private visible: boolean = false;
	private view: vscode.WebviewView | undefined = undefined;
	private markers: Marker[] = [];

	constructor(extensionPath: vscode.Uri, storage: vscode.Memento) {
		this.extesionUri = extensionPath;
		this.storage = storage;
		this.markers = this.storage.get(WORKSPACE_STORAGE_KEY) || [];
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
				case Action.requestOpenDocument:
					return this.handleOpenDocument(data.data);
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

	handleOpenDocument(marker: Marker) {
		vscode.window.showTextDocument(
			vscode.Uri.file(marker.fileName),
			{
				selection: new vscode.Range(marker.start, marker.end)
			}
		);
	}

	initWebview() {
		this.send(Action.init, this.markers);
	}

	addMarker(fileName: string, start: vscode.Position, end: vscode.Position, content: string) {
		const newMarker = createMarker(fileName, start, end, content);
		this.markers.push(newMarker);
		this.syncMarkerState();
		if (this.visible) {
			this.send(Action.addMarker, newMarker);
		}
	}

	syncMarkerState() {
		this.storage.update(WORKSPACE_STORAGE_KEY, this.markers);
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
