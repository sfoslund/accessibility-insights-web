// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { ContentScriptInjector } from 'background/injector/content-script-injector';
import { createDefaultPromiseFactory } from '../../common/promises/promise-factory';
import { createDefaultLogger } from '../../common/logging/default-logger';
import { ChromiumAdapter } from '../../common/browser-adapters/chromium-adapter';
import { PassthroughBrowserEventManager } from 'common/browser-adapters/passthrough-browser-event-manager';

export function activate(context: vscode.ExtensionContext) {
	console.log('Activated');

	let disposable = vscode.commands.registerCommand('accessibility-insights.automated-checks', async (tabId: number) => {
		if (!tabId) {
            const userInput = await vscode.window.showInputBox({
                prompt: 'Tab ID for tab to test',
            });
			if (userInput && !isNaN(Number(userInput))) {
				tabId = Number(userInput);
			} else {
				vscode.window.showErrorMessage('Tab ID not provided or invalid');
				return;
			}
        }

		vscode.window.showInformationMessage('Injecting scripts into tab with ID: ' + tabId);
		injectScripts(tabId);

		// TODO possibly another command -> provide a url and open it in a webview?
		// Based on cursory investigation webviews seem limited but possibly worth more investigation
		const panel = vscode.window.createWebviewPanel(
			'targetPage',
			'TargetPage',
			vscode.ViewColumn.One,
			{}
		  );
	
		const url = 'https://markreay.github.io/AU/before.html';
		panel.webview.html = `<iframe src="${url}" width="100%" height="400px"></iframe>`;
	});

	context.subscriptions.push(disposable);
}

function injectScripts(tabId: number) {
	const browserEventManager = new PassthroughBrowserEventManager();
    const browserAdapter = new ChromiumAdapter(browserEventManager);
    const promiseFactory = createDefaultPromiseFactory();
    const logger = createDefaultLogger();
    const injector = new ContentScriptInjector(browserAdapter, promiseFactory, logger);
    injector.injectScripts(tabId);
}

export function deactivate() {}
