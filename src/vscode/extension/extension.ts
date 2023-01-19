// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import { ContentScriptInjector } from 'background/injector/content-script-injector';
import { createDefaultPromiseFactory } from '../../common/promises/promise-factory';
import { createDefaultLogger } from '../../common/logging/default-logger';
import { ChromiumAdapter } from '../../common/browser-adapters/chromium-adapter';
import { PassthroughBrowserEventManager } from 'common/browser-adapters/passthrough-browser-event-manager';
// const CDP = require('chrome-remote-interface');
import puppeteer from 'puppeteer-core';

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
		await setUpBrowserInstance(tabId);
		// await makeCdpConnection(tabId);
		// injectScripts(tabId); // TODO uncommenting this causes activation error

		// TODO possibly another command -> provide a url and open it in a webview?
		// Based on cursory investigation webviews seem limited but possibly worth more investigation
		// const panel = vscode.window.createWebviewPanel(
		// 	'targetPage',
		// 	'TargetPage',
		// 	vscode.ViewColumn.One,
		// 	{}
		//   );
	
		// const url = 'https://markreay.github.io/AU/before.html';
		// panel.webview.html = `<iframe src="${url}" width="100%" height="400px"></iframe>`;
	});

	context.subscriptions.push(disposable);
}

// TODO just uncommenting this fails-> can only be loaded in browser
// function injectScripts(tabId: number) {
// 	const browserEventManager = new PassthroughBrowserEventManager();
//     const browserAdapter = new ChromiumAdapter(browserEventManager);
//     const promiseFactory = createDefaultPromiseFactory();
//     const logger = createDefaultLogger();
//     const injector = new ContentScriptInjector(browserAdapter, promiseFactory, logger);
//     injector.injectScripts(tabId);
// }

// Attempting to connect to existing browser instance with CDP-> not working, unable to connect/ socket hang up
// async function makeCdpConnection(tabId: number) {
//     let client;
//     try {
//         // connect to endpoint
// 		console.log("Awaiting CDP")
//         client = await CDP({host: '142.251.33.78', port: '443'});
// 		console.log("Got cdp")
//         // extract domains
//         const {Network, Page} = client;
//         // setup handlers
//         Network.requestWillBeSent((params: { request: { url: any; }; }) => {
//             console.log(params.request.url);
//         });
// 		console.log("Set up handler")
//         // enable events then start!
//         await Network.enable();
//         await Page.enable();
//         await Page.navigate({url: 'https://github.com'});
//         await Page.loadEventFired();
// 		console.log("started")
//     } catch (err) {
//         console.error(err);
//     } finally {
//         if (client) {
//             await client.close();
//         }
//     }
// }

async function setUpBrowserInstance(tabId: number) {
	const url = 'https://github.com';
    const { hostname, port, defaultUrl, userDataDir } = getRemoteEndpointSettings();
	const browserPath = await getBrowserPath();
	const browserInstance = await launchBrowser(browserPath, port, url, userDataDir);
}

export async function launchBrowser(browserPath: string, port: number, targetUrl: string, userDataDir?: string): Promise<puppeteer.Browser> {
    const args = [
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${port}`,
        targetUrl,
    ];

    const headless: boolean = false;

    let browserArgs: string[] = [];
    browserArgs = browserArgs.filter(arg => !arg.startsWith('--remote-debugging-port') && arg !== targetUrl);

    if (userDataDir) {
        args.unshift(`--user-data-dir=${userDataDir}`);
        browserArgs = browserArgs.filter(arg => !arg.startsWith('--user-data-dir'));
    }

    if (browserArgs.length) {
        args.unshift(...browserArgs);
    }

    const browserInstance = await puppeteer.launch({executablePath: browserPath, args, headless});
    return browserInstance;
}


export interface IDevToolsSettings {
    hostname: string;
    port: number;
    useHttps: boolean;
    defaultUrl: string;
    userDataDir: string;
    timeout: number;
}

export function getRemoteEndpointSettings(): IDevToolsSettings {
    const hostname: string = 'localhost';
    const port: number = 9222;
    const useHttps: boolean = false;
    const defaultUrl: string = 'http://localhost:3000/';
    const timeout: number = 10000;

    return { hostname, port, useHttps, defaultUrl, userDataDir: '', timeout };
}

export async function getBrowserPath(): Promise<string> {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

export function deactivate() {}
