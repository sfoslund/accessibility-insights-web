// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ElementHandle } from 'playwright';
import { Browser } from '../../common/browser';
import { launchBrowser } from '../../common/browser-factory';
import {
    assessmentAutomatedChecksSelectors,
    detailsViewSelectors,
} from '../../common/element-identifiers/details-view-selectors';
import { DetailsViewPage } from '../../common/page-controllers/details-view-page';
import { scanForAccessibilityIssues } from '../../common/scan-for-accessibility-issues';

describe('Details View -> Assessment -> Automated Checks', () => {
    let browser: Browser;
    let autoChecksPage: DetailsViewPage;

    beforeAll(async () => {
        browser = await launchBrowser({
            suppressFirstTimeDialog: true,
            addExtraPermissionsToManifest: 'fake-activeTab',
        });

        const backgroundPage = await browser.background();
        await backgroundPage.enableFeatureFlag('automatedChecks');
        autoChecksPage = (await browser.newAssessment()).detailsViewPage;
        await autoChecksPage.clickSelector(detailsViewSelectors.testNavLink('Automated checks'));
        await autoChecksPage.waitForSelector(assessmentAutomatedChecksSelectors.ruleDetail);
    });

    afterAll(async () => {
        await browser?.close();
    });

    it('should pass accessibility validation', async () => {
        const results = await scanForAccessibilityIssues(
            autoChecksPage,
            detailsViewSelectors.mainContent,
        );
        expect(results).toHaveLength(0);
    });

    it('renders', async () => {
        const ruleDetails = await autoChecksPage.getSelectorElements(
            assessmentAutomatedChecksSelectors.ruleDetail,
        );

        expect(ruleDetails).toHaveLength(5);

        const expectedCounts = {
            'frame-title': 3,
            'html-has-lang': 1,
            'aria-allowed-role': 3,
            'image-alt': 9,
            label: 3,
        };

        await assertFailureCounts(ruleDetails, expectedCounts);
    });

    async function assertFailureCounts(
        actualRuleDetails: ElementHandle<Element>[],
        expectedCounts: { [ruleName: string]: number },
    ): Promise<void> {
        for (const ruleDetail of actualRuleDetails) {
            const ruleNameElement = await ruleDetail.$(
                assessmentAutomatedChecksSelectors.cardsRuleId,
            );
            let ruleName = await autoChecksPage.evaluate(
                element => element.innerHTML,
                ruleNameElement,
            );
            ruleName = ruleName.replace('<strong>', '');
            ruleName = ruleName.replace('</strong>', '');

            const expectedCount = expectedCounts[ruleName];

            expect(expectedCount).not.toBeNull();

            const countElement = await ruleDetail.$(
                assessmentAutomatedChecksSelectors.failureCount,
            );
            const count = await autoChecksPage.evaluate(
                element => parseInt(element.innerHTML, 10),
                countElement,
            );

            expect(count).toBe(expectedCount);
        }
    }
});
