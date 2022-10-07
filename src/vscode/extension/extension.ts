// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Activated');

	let disposable = vscode.commands.registerCommand('accessibility-insights.automated-checks', (tabId: number) => {
		vscode.window.showInformationMessage('TabID: ' + tabId);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
