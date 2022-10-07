// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { ContentScriptInjector } from 'background/injector/content-script-injector';
import { createDefaultPromiseFactory } from '../../common/promises/promise-factory';
import { createDefaultLogger } from '../../common/logging/default-logger';
import { BrowserAdapter } from '../../common/browser-adapters/browser-adapter';

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
	});

	context.subscriptions.push(disposable);
}

function injectScripts(tabId: number) {
    const browserAdapter = {} as BrowserAdapter; // TODO need executeScriptInTab and insertCSSInTab implemented
    const promiseFactory = createDefaultPromiseFactory();
    const logger = createDefaultLogger();
    const injector = new ContentScriptInjector(browserAdapter, promiseFactory, logger);
    injector.injectScripts(tabId);
}

export function deactivate() {}
