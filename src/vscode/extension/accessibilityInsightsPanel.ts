// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as path from 'path';
import * as vscode from 'vscode';
import { PanelSocket, WebSocketEvent, WebviewEvent } from 'vscode/extension/panelSocket';
import { AccessibilityInsightsView } from 'vscode/extension/view';

export function encodeMessageForChannel(
    postMessageCallback: (message: string) => void,
    eventType: WebviewEvent,
    args?: unknown): void {
    const message = `${eventType}:${JSON.stringify(args)}`;
    postMessageCallback(message);
}

export class AccessibilityInsightsPanel {
    private readonly context: vscode.ExtensionContext;
    private readonly extensionPath: string;
    private readonly panel: vscode.WebviewPanel;
    private targetUrl: string
    private panelSocket: PanelSocket;
    static instance: AccessibilityInsightsPanel | undefined;
    private readonly diagnosticsCollection: vscode.DiagnosticCollection;

    private constructor(
        panel: vscode.WebviewPanel,
        context: vscode.ExtensionContext,
        targetUrl: string) {
        this.panel = panel;
        this.context = context;
        this.targetUrl = targetUrl;
        this.extensionPath = this.context.extensionPath;

        this.panelSocket = new PanelSocket(this.targetUrl, (e, msg) => this.postToWebview(e, msg));
        this.panelSocket.on('close', () => this.onSocketClose());
        this.panelSocket.on('websocket', msg => console.log(JSON.stringify(msg)));//this.onSocketMessage(msg));

        // Handle closing
        this.panel.onDidDispose(() => {
            this.dispose();
            this.panelSocket.dispose();
        }, this);

        // Handle view change
        this.panel.onDidChangeViewState(_e => {
            if (this.panel.visible) {
                this.update();
            }
        }, this);

        this.panelSocket.on('runAutomatedChecks', () => this.runAutomatedChecks());

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(message => {
            console.log("Received message: " + message)
            this.panelSocket.onMessageFromWebview(message);
        }, this);

        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('Accessibility Insights');
    }

    dispose(): void {
        AccessibilityInsightsPanel.instance = undefined;

        this.panel.dispose();
        this.panelSocket.dispose();
    }

    private onSocketClose() {
        this.dispose();
    }

    // private onSocketMessage(message: string) {
    //     // If inspect mode is toggled on the DevTools, we need to let the standalone screencast
    //     // know in order to enable hover events to be sent through.
    //     if (message && (message.includes('AutomatedChecks') || message.includes('AccessibilityInsights'))) {
    //         try {
    //             const cdpMsg = JSON.parse((JSON.parse(message) as {message: string}).message) as 
    //                 {method: string, params: {result: {violations: {id: string, impact: string, help: string, nodes: {html: string}[]}[], url: string}}};
    //             const { method, params } = JSON.parse((JSON.parse(message) as {message: string}).message) as {method: string, params: any };
    //             if (method === 'Page.runAutomatedChecks') {
    //                 this.runAutomatedChecks()
    //             }
    //             if(method === 'AccessibilityInsights.injectScripts') {
    //                 void vscode.commands.executeCommand(`${SETTINGS_VIEW_NAME}.injectScripts`, true);
    //             }
    //             if(method === 'AccessibilityInsights.showAutomatedChecksResults') {
    //                 if (cdpMsg.params.result.violations.length === 0) {
    //                     vscode.window.showInformationMessage(`No accessibility violations detected in ${cdpMsg.params.result.url}`);
    //                     this.diagnosticsCollection.clear();
    //                     return;
    //                 }

    //                 this.getDocumentUris(cdpMsg.params.result.url).then(uris => {
    //                     const diagnosticsPromises : Promise<[vscode.Uri, vscode.Diagnostic | undefined]>[] = [];
    //                     for (const uri of uris) {
    //                         for (const violation of cdpMsg.params.result.violations) {
    //                             for (const node of violation.nodes) {
    //                                 const newPromise : Promise<[vscode.Uri, vscode.Diagnostic | undefined]> = this.getViolationRange(uri, node.html).then(range => {
    //                                     if (range) {
    //                                         // Construct violation pointing to correct location in the source file
    //                                         return [uri, {code: `Accessibility Insights (${violation.id})`,
    //                                             message: violation.help,
    //                                             severity: this.convertImpactToDiagSeverity(violation.impact),
    //                                             range: range
    //                                         }];
    //                                     } else {
    //                                         // Couldn't find the violating code snippet in this file, don't highlight anything
    //                                         return [uri, undefined];
    //                                     }
    //                                 });

    //                                 diagnosticsPromises.push(newPromise);
    //                             }
    //                         }
    //                     }
    //                     Promise.all(diagnosticsPromises).then(diagnosticsResults => {
    //                         // Update problems pane
    //                         this.diagnosticsCollection.clear();
    //                         const uris = diagnosticsResults.map(result => result[0])
    //                             .filter((value, index, self) => self.indexOf(value) === index);
    //                         for (const uri of uris) {
    //                             const diagResults = diagnosticsResults.filter(res => res[0] === uri)
    //                                 .map(res => res[1])
    //                                 .filter(diagnostic => diagnostic) as vscode.Diagnostic[];
    //                             this.diagnosticsCollection.set(uri, diagResults);
    //                         }
    //                     });
    //                 });
    //             }
    //             if(method === 'AccessibilityInsights.logAutomatedChecks'){
    //                 console.log({params, message})
    //             }
    //         } catch (e) {
    //             console.log("AN ERROR", e)
    //         }
    //     }
    //     // TODO: Handle message
    // }

    private update() {
        this.panel.webview.html = this.getHtmlForWebview();
    }

    private postToWebview(e: WebSocketEvent, message?: string) {
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'websocket', { event: e, message });
    }

    public runAutomatedChecks(){
        console.log("Run automated checks...")
        encodeMessageForChannel(msg => this.panel.webview.postMessage(msg) as unknown as void, 'runAutomatedChecks', {});
        
        // TODO testing-> max call stack exceeded
        const message = `runAutomatedChecks:${JSON.stringify({})}`;
        this.panelSocket.onMessageFromWebview(message);
    }

    private getHtmlForWebview() {
        const inspectorPath = vscode.Uri.file(path.join(this.extensionPath, 'out/accessibilityInsights', 'accessibilityInsights.bundle.js'));
        const inspectorUri = this.panel.webview.asWebviewUri(inspectorPath);
		const codiconsUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const cssPath = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'out/accessibilityInsights', 'view.css'));
        const view = new AccessibilityInsightsView(this.panel.webview.cspSource, cssPath, codiconsUri, inspectorUri);
        return view.render();
    }

    static createOrShow(context: vscode.ExtensionContext, targetUrl: string): void {
        const column = vscode.ViewColumn.Beside;
        if (AccessibilityInsightsPanel.instance) {
            AccessibilityInsightsPanel.instance.dispose();
        } else {
            const panel = vscode.window.createWebviewPanel('accessibility-insights', 'Accessibility Insights', column, {
                enableCommandUris: true,
                enableScripts: true,
                retainContextWhenHidden: true,
            });
            AccessibilityInsightsPanel.instance = new AccessibilityInsightsPanel(panel, context, targetUrl);
        }
    }
}
