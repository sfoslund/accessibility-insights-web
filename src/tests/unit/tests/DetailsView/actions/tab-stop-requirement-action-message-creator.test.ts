// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import {
    AddTabStopInstancePayload,
    UpdateTabStopRequirementStatusPayload,
    UpdateTabStopInstancePayload,
    RemoveTabStopInstancePayload,
} from 'background/actions/action-payloads';
import { ActionMessageDispatcher } from 'common/message-creators/types/dispatcher';
import { IMock, It, Mock, Times } from 'typemoq';
import {
    TelemetryEventSource,
    TriggeredByNotApplicable,
} from '../../../../../common/extension-telemetry-events';
import { Messages } from '../../../../../common/messages';
import { TelemetryDataFactory } from '../../../../../common/telemetry-data-factory';
import { TabStopRequirementActionMessageCreator } from '../../../../../DetailsView/actions/tab-stop-requirement-action-message-creator';

describe('TabStopRequirementActionMessageCreatorTest', () => {
    let telemetryFactoryMock: IMock<TelemetryDataFactory>;
    let dispatcherMock: IMock<ActionMessageDispatcher>;
    let testSubject: TabStopRequirementActionMessageCreator;

    beforeEach(() => {
        dispatcherMock = Mock.ofType<ActionMessageDispatcher>();
        telemetryFactoryMock = Mock.ofType(TelemetryDataFactory);
        testSubject = new TabStopRequirementActionMessageCreator(
            telemetryFactoryMock.object,
            dispatcherMock.object,
        );
    });

    test('updateTabStopRequirementStatus', () => {
        const requirementStatus: UpdateTabStopRequirementStatusPayload = {
            requirementId: 'input-focus',
            status: 'pass',
        };

        const telemetry = {
            triggeredBy: TriggeredByNotApplicable,
            source: TelemetryEventSource.DetailsView,
            requirementId: requirementStatus.requirementId,
        };

        const expectedMessage = {
            messageType: Messages.Visualizations.TabStops.UpdateTabStopsRequirementStatus,
            payload: {
                ...requirementStatus,
                telemetry,
            },
        };
        telemetryFactoryMock
            .setup(tf => tf.forTabStopRequirement(requirementStatus.requirementId))
            .returns(() => telemetry);

        testSubject.updateTabStopRequirementStatus(
            requirementStatus.requirementId,
            requirementStatus.status,
        );

        dispatcherMock.verify(
            dispatcher => dispatcher.dispatchMessage(It.isValue(expectedMessage)),
            Times.once(),
        );

        telemetryFactoryMock.verifyAll();
    });

    test('addTabStopInstance', () => {
        const requirementInstance: AddTabStopInstancePayload = {
            requirementId: 'input-focus',
            description: 'testing',
        };

        const telemetry = {
            triggeredBy: TriggeredByNotApplicable,
            source: TelemetryEventSource.DetailsView,
            requirementId: requirementInstance.requirementId,
        };

        const expectedMessage = {
            messageType: Messages.Visualizations.TabStops.AddTabStopInstance,
            payload: {
                ...requirementInstance,
                telemetry,
            },
        };

        telemetryFactoryMock
            .setup(tf => tf.forTabStopRequirement(requirementInstance.requirementId))
            .returns(() => telemetry);

        testSubject.addTabStopInstance(
            requirementInstance.requirementId,
            requirementInstance.description,
        );

        dispatcherMock.verify(
            dispatcher => dispatcher.dispatchMessage(It.isValue(expectedMessage)),
            Times.once(),
        );

        telemetryFactoryMock.verifyAll();
    });

    test('updateTabStopInstance', () => {
        const requirementInstance: UpdateTabStopInstancePayload = {
            requirementId: 'input-focus',
            description: 'testing',
            id: 'abc',
        };

        const telemetry = {
            triggeredBy: TriggeredByNotApplicable,
            source: TelemetryEventSource.DetailsView,
            requirementId: requirementInstance.requirementId,
        };

        const expectedMessage = {
            messageType: Messages.Visualizations.TabStops.UpdateTabStopInstance,
            payload: {
                ...requirementInstance,
                telemetry,
            },
        };
        telemetryFactoryMock
            .setup(tf => tf.forTabStopRequirement(requirementInstance.requirementId))
            .returns(() => telemetry);

        testSubject.updateTabStopInstance(
            requirementInstance.requirementId,
            requirementInstance.id,
            requirementInstance.description,
        );

        dispatcherMock.verify(
            dispatcher => dispatcher.dispatchMessage(It.isValue(expectedMessage)),
            Times.once(),
        );

        telemetryFactoryMock.verifyAll();
    });

    test('removeTabStopInstance', () => {
        const requirementInstance: RemoveTabStopInstancePayload = {
            requirementId: 'input-focus',
            id: 'abc',
        };

        const telemetry = {
            triggeredBy: TriggeredByNotApplicable,
            source: TelemetryEventSource.DetailsView,
            requirementId: requirementInstance.requirementId,
        };

        const expectedMessage = {
            messageType: Messages.Visualizations.TabStops.RemoveTabStopInstance,
            payload: {
                ...requirementInstance,
                telemetry,
            },
        };

        telemetryFactoryMock
            .setup(tf => tf.forTabStopRequirement(requirementInstance.requirementId))
            .returns(() => telemetry);

        testSubject.removeTabStopInstance(
            requirementInstance.requirementId,
            requirementInstance.id,
        );

        dispatcherMock.verify(
            dispatcher => dispatcher.dispatchMessage(It.isValue(expectedMessage)),
            Times.once(),
        );

        telemetryFactoryMock.verifyAll();
    });
});
