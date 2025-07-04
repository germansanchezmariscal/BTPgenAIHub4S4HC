/**
 * 
 * @On(event = { "Action1" }, entity = "german_1_STUDENTH01Srv.CustomerMessages")
 * @param {cds.Request} request - User information, tenant-specific CDS model, headers and query parameters
*/


const cds = require('@sap/cds');
const LOG = cds.log('GenAI');
const { generateResponseTechMessage, generateResponseOtherMessage } = require('./genai/orchestration');
const { generateEmbedding } = require('./genai/embedding');

const SIMILARITY_THRESHOLD = 0.45;


module.exports = async function(request) {
	// Your code here

    const { ID } = request.params[0] || {};
// Check if the ID parameter is provided
if (!ID) {
    return request.reject(400, 'ID parameter is missing.');
}

let customerMessage;
try {
    // Retrieve the CustomerMessage record based on the provided ID
    customerMessage = await SELECT.one.from('German_1_STUDENTH01.CustomerMessages').where({ ID });
    if (!customerMessage) {
        throw new Error(`CustomerMessage with ID ${ID} not found.`);
    }
} catch (error) {
    LOG.error('Failed to retrieve customer message', error.message);
    return request.reject(500, `Failed to retrieve customer message with ID ${ID}`);
}

const { fullMessageCustomerLanguage, messageCategory, messageSentiment, S4HCP_ServiceOrder_ServiceOrder: attachedSOId } = customerMessage;

let soContext = '';
if (attachedSOId) {
    try {
        // Connect to the S4HCP Service Order OData service
        const s4HcpServiceOrderOdata = await cds.connect.to('S4HCP_ServiceOrder_Odata');
        const { A_ServiceOrder } = s4HcpServiceOrderOdata.entities;

        // Fetch service order details, including long text notes
        const s4hcSO = await s4HcpServiceOrderOdata.run(
            SELECT.from(A_ServiceOrder, so => {
                so('ServiceOrder');
                so.to_Text(note => {
                    note('LongText');
                });
            }).where({ ServiceOrder: attachedSOId })
        );

        if (s4hcSO && s4hcSO.length > 0) {
            const serviceOrder = s4hcSO[0];
            const notes = serviceOrder.to_Text || [];
            soContext = notes.map(note => note.LongText || '').join(' ');
        } else {
            LOG.warn(`No service order found for ID: ${attachedSOId}`);
            soContext = '';
        }
    } catch (error) {
        LOG.error('Error fetching service order details:', error.message);
        soContext = '';
    }
} else {
    LOG.warn('No or Invalid attachedSOId provided.');
}

let resultJSON;
if (messageCategory === 'Technical') {
    let fullMessageEmbedding;
    try {
        // Generate embedding for the technical message
        fullMessageEmbedding = await generateEmbedding(request, fullMessageCustomerLanguage);
    } catch (err) {
        LOG.error('Embedding service failed', err);
        return request.reject(500, 'Embedding service failed');
    }

    let relevantFAQs;
    try {
        // Retrieve relevant FAQ items based on the similarity with the generated embedding
        relevantFAQs = await SELECT.from('German_1_STUDENTH01.ProductFAQ')
            .columns('ID', 'issue', 'question', 'answer')
            .where`cosine_similarity(embedding, to_real_vector(${fullMessageEmbedding})) > ${SIMILARITY_THRESHOLD}`;
    } catch (error) {
        LOG.error('Failed to retrieve FAQ items', error.message);
        //return request.reject(500, 'Failed to retrieve FAQ items');
    }

    const faqItem = (relevantFAQs && relevantFAQs.length > 0) ? relevantFAQs[0] : { issue: '', question: '', answer: '' };
    try {
        // Generate response for the technical message using the FAQ item and service order context
        resultJSON = await generateResponseTechMessage(faqItem.issue, faqItem.question, faqItem.answer, fullMessageCustomerLanguage, soContext);
    } catch (err) {
        LOG.error('Completion service failed', err);
        return request.reject(500, 'Completion service failed');
    }
} else {
    try {
        // Generate response for non-technical messages, including service order context
        resultJSON = await generateResponseOtherMessage(messageSentiment, fullMessageCustomerLanguage, soContext);
    } catch (err) {
        LOG.error('Completion service failed', err);
        return request.reject(500, 'Completion service failed');
    }
}

const { suggestedResponseCustomerLanguage, suggestedResponseEnglish } = resultJSON;
// Ensure the generated responses are valid before updating the record
if (!suggestedResponseCustomerLanguage || !suggestedResponseEnglish) {
    return request.reject(500, 'Completion service failed. Generated responses are invalid');
}

try {
    // Update the CustomerMessage with the generated responses
    await UPDATE('German_1_STUDENTH01.CustomerMessages').set({
        suggestedResponseCustomerLanguage,
        suggestedResponseEnglish,
    }).where({ ID });
    LOG.info(`CustomerMessage with ID ${ID} updated with a reply to the customer.`);
} catch (error) {
    LOG.error('Failed to update customer message', error.message);
    return request.reject(500, `Failed to update customer message with ID ${ID}`);
}

}