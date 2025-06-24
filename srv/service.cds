using { German_1_STUDENTH01 as my } from '../db/schema.cds';

@path: '/service/german_1_STUDENTH01'
@requires: 'authenticated-user'
service german_1_STUDENTH01Srv {
  @odata.draft.enabled
  entity CustomerMessages as projection on my.CustomerMessages;
}