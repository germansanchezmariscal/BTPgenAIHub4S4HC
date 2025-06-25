sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'german1studenth01/productfaqapp/test/integration/FirstJourney',
		'german1studenth01/productfaqapp/test/integration/pages/ProductFAQList',
		'german1studenth01/productfaqapp/test/integration/pages/ProductFAQObjectPage'
    ],
    function(JourneyRunner, opaJourney, ProductFAQList, ProductFAQObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('german1studenth01/productfaqapp') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheProductFAQList: ProductFAQList,
					onTheProductFAQObjectPage: ProductFAQObjectPage
                }
            },
            opaJourney.run
        );
    }
);