// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as vscode from 'vscode';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { isEmpty } from 'lodash';
import path from 'path';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('accessibility-insights.automated-checks', async () => {
		const userInput = await vscode.window.showInputBox({
			prompt: 'Test url',
			placeHolder: 'https://github.com'
		});
		const url = (userInput === undefined || userInput === null || isEmpty(userInput)) ? 'https://github.com' : userInput;

		vscode.window.showInformationMessage('Starting up test page with url ' + url);
		var browser = await setUpBrowserInstance(url);
		await injectScripts(browser);
        let page = (await browser.pages())[0];
        var axeRunResults = await runAutomatedChecks(page);
        console.log(JSON.stringify(axeRunResults))
        vscode.window.showInformationMessage("Finished running axe " + axeRunResults.value.testEngine.version + " against " + axeRunResults.value.url)
        showViolations(axeRunResults.value.violations) 
	});

	context.subscriptions.push(disposable);
}

async function setUpBrowserInstance(url: string): Promise<Browser> {
    const { hostname, port, defaultUrl, userDataDir } = getRemoteEndpointSettings();
	const browserPath = await getBrowserPath();
	const browserInstance = await launchBrowser(browserPath, port, url, userDataDir);
	return browserInstance
}

export async function launchBrowser(browserPath: string, port: number, targetUrl: string, userDataDir?: string): Promise<Browser> {
    const args = [
        '--no-first-run',
        '--no-default-browser-check',
        `--remote-debugging-port=${port}`,
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
    let page = (await browserInstance.pages())[0];
    await page.setBypassCSP(true);
    await page.goto(targetUrl);
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

const rootContainerId = 'accessibility-insights-root-container';

async function injectScripts(browserInstance: Browser): Promise<void> {
    try {
        const pages = await browserInstance.pages();
        const page = pages[0];
        await injectAxeIfUndefined(page);
        var injectedPath = path.join(__dirname, '../../extension/devBundle/injected.css');
        await page.addStyleTag({path: injectedPath});
        await page.evaluate((id) => {
            const root = document.createElement('div');
            root.id = id;
            document.body.append(root);
        }, rootContainerId)
        await createShadowHost(page);
        const shadowHostElement = await page.$(`#insights-shadow-host`);
        await page.evaluate((shadowHostElement, pathName) => {
            const shadow = shadowHostElement!.attachShadow({mode: 'open'});
            const container = document.createElement('div');
            container.id = 'insights-shadow-container';
            shadow.append(container);
            const shadowContainer = shadow.firstChild as HTMLElement;
            const styleElement = document.createElement('link');
            styleElement.rel = 'stylesheet';
            styleElement.href = pathName;
            styleElement.type = 'text/css';
            shadowContainer.appendChild(styleElement);
            return shadowContainer;
        }, shadowHostElement, injectedPath)
    }catch(error){
        console.log(error)
    }
}

async function createShadowHost(page: Page): Promise<HTMLElement> {
    return await page.evaluate((rootContainerId) => {
        const rootContainer = document.getElementById(rootContainerId)
        if (rootContainer == null) {
            throw Error('expected rootContainer to be defined and not null');
        }
        const host = document.createElement('div');
        host.id = 'insights-shadow-host';
        rootContainer.append(host);
        return host;
    }, rootContainerId)
}

async function injectAxeIfUndefined(page: Page): Promise<void> {
    const axeIsUndefined = await page.evaluate(() => {
        return (window as any).axe === undefined;
    }, null);

    if (axeIsUndefined) {
		console.log("Axe was undefined, injecting axe")
        await injectScriptFile(
            page,
            'C:/code/accessibility-insights-web/node_modules/axe-core/axe.min.js',
        );

        await page.waitForFunction(() => {
            return (window as any).axe !== undefined;
        });
		console.log("Finished injecting axe")
    }
}

async function injectScriptFile(page: Page, filePath: string): Promise<void> {
    await page.addScriptTag({ path: filePath, type: 'module' });
}

async function runAutomatedChecks(page: Page): Promise<any> {
    const cdpConnection = await page.target().createCDPSession();
    const { exceptionDetails: evaluateExceptionDetails, result: evaluateRemoteObject } = await cdpConnection.send("Runtime.evaluate", { expression: 'window.axe.run(document, {runOnly: { type: "tag", values: ["wcag2a", "wcag21a", "wcag2aa", "wcag21aa"]}})' })
    handleException(evaluateExceptionDetails)
    const { exceptionDetails: awaitExceptionDetails, result: axeRunResults } = await cdpConnection.send("Runtime.awaitPromise", { promiseObjectId: evaluateRemoteObject.objectId!, returnByValue: true, generatePreview: true})
    handleException(awaitExceptionDetails)
    return axeRunResults;
}

function handleException(error: any): void {
    if (error) {
        console.log(error);
        vscode.window.showErrorMessage("Error running automated checks: " + error)
    }
}

function showViolations(violations: any) {
    const diagnosticsCollection = vscode.languages.createDiagnosticCollection('Accessibility Insights');

    const diagResults: vscode.Diagnostic[] = violations.map((violation: { id: any; help: any; }) => {
        return { 
            code: `Accessibility Insights (${violation.id})`,
            message: violation.help,
            severity: vscode.DiagnosticSeverity.Error,
        } as vscode.Diagnostic});
    diagnosticsCollection.set(vscode.Uri.parse('C:/code/accessibility-insights-web/test.ts'), diagResults);
}

export function deactivate() {}
