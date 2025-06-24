sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'german1studenth01/customermessages/test/integration/FirstJourney',
		'german1studenth01/customermessages/test/integration/pages/CustomerMessagesList',
		'german1studenth01/customermessages/test/integration/pages/CustomerMessagesObjectPage'
    ],
    function(JourneyRunner, opaJourney, CustomerMessagesList, CustomerMessagesObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('german1studenth01/customermessages') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheCustomerMessagesList: CustomerMessagesList,
					onTheCustomerMessagesObjectPage: CustomerMessagesObjectPage
                }
            },
            opaJourney.run
        );
    }
);