import LocalizedStrings, { 
  LocalizedStringsMethods
} from 'localized-strings';

export interface IStrings extends LocalizedStringsMethods {
  errorCommunicatingWithServer: string,
  menuBarUserItemText: string
  menuBarManageAccountText: string
  menuBarLogoutText: string
  welcomeLoginButtonText: string
  siteHeader: string
  news: string
  deliveries: string
  contracts: string
  contract: string
  operations: string
  frozen: string
  fresh: string
  contractQuantity: string
  deliveredQuantity: string
  welcome: string
  redirectingTokeycloak: string
  downloadXLSX: string
  newContract: string
  supplierName: string
  status: string
  itemGroup: string
  contractAmount: string
  deliveriedAmount: string
  deliveryPlace: string
  remarkField: string
  dates: string
  viewContract: string
  editContract: string
  editContractTemplate: string
  contractTemplatePDF: string
  rejected: string
  approved: string
  onHold: string
  draft: string
  terminated: string
  sapId: string
  quantityComment: string
  quantity: string
  deliveryPlaceComment: string
  remarkFieldSap: string
  back: string
  save: string
  loading: string
  amountProposed: string
  deliveryPalceProposed: string
  contactNotFound: string
  itemGroupNotFound: string
  contractDocumentInfoText: string
  header: string
  content: string
  footer: string
  amount: string
  amountInfoTextFresh: string
  showPastYearAmounts: string
  wantToDeliverAll: string
  comment: string
  pastYearAmounts: string
  year: string
  blocks: string
  area: string
  species: string
  profitEstimationPerHectare: string,
  name: string
  size: string
  totalAmountOfBlocks: string
  minimumContractAmountText: string
  areaDetailsTotal: string
  hectaresInProduction: string
  addRow: string
  decline: string
  downloadContractAsPDF: string
  contractFrozenHeader: string
  contractFreshHeader: string
  infoRejected: string
  infoOnHold: string
  checkDraft: string
  contractManagement: string
  itemGroupsManagement: string
  productsManagement: string
  chatManagement: string,
  suggestNewFrozenContract: string
  suggestNewFreshContract: string
  parties: string
  farmer: string
  company: string
  pricesText: string
  strawberry1: string
  strawberry2: string
  strawberry3: string
  strawberry4: string
  blackcurrant1: string
  blackcurrant2: string
  blackcurrant3: string
  blackcurrant4: string
  default1: string
  default2: string
  default3: string
  contractDetailsListItem1: string
  contractDetailsListItem2: string
  contractDetailsListItem3: string
  contractDetailsListItem4: string
  contractDetailsListItem5: string
  contractDetailsReadFromContract: string
  missingPrerequisiteContract: string
  insufficientContractAmount: string
  fillAreaDetails: string
  fillAllAreaDetailFields: string
  hidePastPrices: string
  showPastPrices: string
  guaranteedPrices: string
  suggestAnotherContract: string
  berry: string
  close: string
  send: string
  sendAnswer: string
  confirmRejectText: string
  cancel: string
  signContractFirst: string
  termsNotAccepted: string
  notViableToSign: string
  ssnNotGiven: string
  signingContinuesOnNewTab: string
  signingWentWrong: string
  contractHarvestSeason: string
  termsAccepted: string
  viableToSign: string
  signingService: string
  ssn: string
  sign: string
  product: string
  deliveyDate: string
  addNote: string
  newFreshDelivery: string
  newFrozenDelivery: string
  newFreshWeekDeliveryPrediction: string
  newFrozenWeekDeliveryPrediction: string
  lastWeekDeliveries: string
  nextWeekPrediction: string
  dailyAverage: string
  changeComparedToLastWeek: string
  deliveryDay: string
  deliveryDays: string
  weekDeliveryPredictions: string
  incomingDeliveries: string
  pastDeliveries: string
  suggestions: string
  image: string
  addNew: string
  addImage: string
  addImageShort: string
  note: string
  editDelivery: string
  manageIncomingDeliveries: string
  products: string
  approveDelivery: string
  freshProducts: string
  frozenProducts: string
  open: string
  deliveried: string
  acceptSuggestion: string
  productName: string
  productUnitName: string
  productUnitSize: string
  productUnits: string
  accept: string
  freshProposals: string
  frozenProposals: string
  check: string
  delivery: string
  week: string
  freshWeekDeliveryPredictions: string
  frozenWeekDeliveryPredictions: string
  weekDeliveryNotFound: string
  somethingWentWrong: string
  error: string
  gallery: string
  openGallery: string
  uploadImage: string
  title: string
  deleteImage: string
  confirmEditNews: string
  confirmDeleteNews: string
  delete: string
  edit: string
  createNewArticle: string
  showContract: string
  missingInfo: string
  contractTerminated: string
  contractsOnDraft: string
  contractsOnActive: string
  contractsOnTerminated: string
  downloadPdf : string
  accessTokenExpired: string
  questionGroupManagement: string,
  groupPermissions: string,
  noSelectedImage: string,
  groupPermissionNONE: string,
  groupPermissionTRAVERSE: string,
  groupPermissionACCESS: string,
  groupPermissionMANAGE: string,
  chatGroups: string,
  questionGroups: string,
  newQuestionGroup: string,
  newChatGroup: string,
  newQuestionGroupTitle: string,
  newChatGroupTitle: string,
  pastFreshDeliveries: string,
  pastFrozenDeliveries: string,
  createNewFreshPrediction : string,
  createNewFrozenPrediction : string,
  freshDeliveries: string,
  frozenDeliveries: string,
  createNewFreshDelivery : string,
  createNewFrozenDelivery : string,
  lastDayToAnswer: string,
  expireDate: string,
  voteResults: string,
  answerType: string,
  pollDescription: string,
  pollChoices: string,
  insertPollChoicesBelow: string,
  redBoxesLoaned: string
  redBoxesReturned: string
  grayBoxesLoaned: string
  grayBoxesReturned: string
  frozenCategory: string;
  freshCategory: string;
  databank: string;
  openingHoursManagement: string;
  addNewHours: string;
  deleteHours: string;
  qualityManagement: string;
  newOpeningHoursPeriod: string;
  newExceptionHours: string;
  editOpeningHours: string;
  previewOpeningHours: string;
  closed: string;
  defaultPeriods: string;
  exceptionPeriods: string;
  deleteBlock: string;
  selectDeliveryPlace: string;
}

const strings: IStrings = new LocalizedStrings({
  en: require("./fi.json")
});

export default strings;