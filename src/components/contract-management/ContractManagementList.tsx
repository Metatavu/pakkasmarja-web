import * as React from "react";
import * as actions from "../../actions/";
import * as _ from "lodash";
import { StoreState, HttpErrorResponse, FilterContracts } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import Api, { Contract, Contact, DeliveryPlace, ContractDocumentTemplate, ItemGroupDocumentTemplate, ContractStatus, ContractPreviewData } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button, Dropdown, Form, List, Dimmer, Loader, Grid, Icon, Input, TextArea, DropdownProps, InputOnChangeData, TextAreaProps, DropdownItemProps } from "semantic-ui-react";
import ErrorMessage from "../generic/ErrorMessage";
import { Table } from 'semantic-ui-react';
import { Link } from "react-router-dom";
import * as moment from 'moment';
import TableBasicLayout from "../contract-management/TableBasicLayout";
import BasicLayout from "../generic/BasicLayout";
import strings from "src/localization/strings";
import { PDFService } from "src/api/pdf.service";
import FileUtils from "src/utils/FileUtils";
import XlsxContractsPreview from "./xlsx-contract-preview";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component state
 */
interface State {
  tableEditMode: boolean;
  editedContracts: Contract[];
  xlsxPreviewOpen: boolean;
  parsedXlsxObjects: ContractPreviewData[];
  keycloak?: Keycloak.KeycloakInstance;
  contracts: Contract[],
  itemGroups: { [key: string] : ItemGroup },
  contacts: { [key: string] : Contact },
  deliveryPlaces: { [key: string] : DeliveryPlace },
  contractsLoading: boolean,
  proposeContractModalOpen: boolean,
  selectedBerry: string,
  proposedContractQuantity: string,
  proposedContractQuantityComment: string,
  proposeContractModalType: string,
  errorMessage?: string,
  filters: FilterContracts,
  offset: number,
  limit: number,
  contractsLength: number
}

/**
 * Class for contract list component
 */
class ContractManagementList extends React.Component<Props, State> {

  /**
   * Reference to input element
   */
  private xlsxInput = React.createRef<HTMLInputElement>();

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      tableEditMode: false,
      editedContracts: [],
      xlsxPreviewOpen: false,
      parsedXlsxObjects: [],
      contracts: [],
      itemGroups: {},
      contacts: {},
      deliveryPlaces: {},
      contractsLoading: false,
      proposeContractModalOpen: false,
      selectedBerry: "",
      proposedContractQuantity: "",
      proposedContractQuantityComment: "",
      proposeContractModalType: "",
      filters: {
        itemGroupId: undefined,
        status: undefined,
        year: undefined,
        firstResult: 0,
        maxResults: 10
      },
      offset: 0,
      limit: 10,
      contractsLength: 0
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    await this.loadData();
  }

  /**
   * Load data
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ 
      contractsLoading: true, 
      errorMessage: undefined, 
      contracts: [] 
    });

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contracts: Contract[] | HttpErrorResponse = await contractsService.listContracts("application/json", true, undefined, this.state.filters.itemGroupId, this.state.filters.year, this.state.filters.status, this.state.offset, this.state.limit);
    this.setState({ contractsLength: contracts.length });

    if (this.isHttpErrorResponse(contracts)) {
      this.renderErrorMessage(contracts);
      return;
    }

    await this.loadItemGroups();
    await this.loadDeliveryPlaces();
    await this.loadContacts(contracts);
    
    this.setState({ 
      contractsLoading: false, 
      contracts: contracts
    });
  }

  /**
   * Check if object is http error response
   */
  private isHttpErrorResponse(object: Contract[] | HttpErrorResponse): object is HttpErrorResponse {
    return 'code' in object;
  }

  /**
   * Render error message
   * 
   * @param response http response
   */
  private renderErrorMessage = (response: HttpErrorResponse) => {
    switch (response.code) {
      case 403:
        this.setState({
          errorMessage: "Sinulla ei ole oikeuksia hallita sopimuksia. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan."
        });
        break;
      default:
        this.setState({
          errorMessage: "Jokin meni pieleen sopimuksia ladattaessa. Yritä hetken kuluttua uudelleen."
        });
        break;
    }
  }

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroupsService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups = await itemGroupsService.listItemGroups();

    this.setState({ itemGroups: _.keyBy(itemGroups, "id") });
  }
  
  /**
   * Load delivery places
   */
  private loadDeliveryPlaces = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const deliveryPlacesService = await Api.getDeliveryPlacesService(this.props.keycloak.token);
    const deliveryPlaces = await deliveryPlacesService.listDeliveryPlaces();
    this.setState({ deliveryPlaces: _.keyBy(deliveryPlaces, "id") });
  }
  
  /**
   * Loads contacts for given contracts into the state
   * 
   * @param contracts
   */
  private loadContacts = async (contracts: Contract[]) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const contactsService = await Api.getContactsService(this.props.keycloak.token);
    const contacts = _.clone(this.state.contacts || {});

    const contactIds = _.uniq(contracts.map((contract) => {
      return contract.contactId!;
    }));

    for (let i = 0; i < contactIds.length; i++) {
      const contactId = contactIds[i];

      if (!contacts[contactId]) {
        contacts[contactId] = await contactsService.findContact(contactId);
      }
    }

    this.setState({
      contacts: contacts
    });
  }
  
  /**
   * Render drop down
   * 
   * @param options options
   * @param value value
   * @param onChange onChange function
   * @param placeholder placeholder
   */
  private renderDropDown = (options: any, value: string | number, onChange: (value: string) => void, placeholder: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }

    const optionsWithPlaceholder = [{ key: placeholder, value: undefined, text: placeholder }].concat(options);

    return (
      <Dropdown
        fluid
        placeholder={placeholder}
        selection
        value={value}
        options={optionsWithPlaceholder}
        onChange={(event, data) => { onChange(data.value as string) }
        }
      />
    );
  }

  /**
   * Method for rendering edit buttons
   */
  private renderEditButtons = () => {
    const { tableEditMode } = this.state;

    if (!tableEditMode) {
      return (
        <Button onClick={ this.toggleTableEditMode }>{ strings.editMode }</Button>
      );
    }

    return (
      <>
        <Button onClick={ this.saveTable } color="red">{ strings.save }</Button>
        <Button onClick={ this.toggleTableEditMode }>{ strings.cancel }</Button>
      </>
    );
  }

  /**
   * Method for rendering contract status
   *
   * @param contract contract
   */
  private renderEditableStatus = (contract: Contract) => {
    const { tableEditMode } = this.state;

    if (!tableEditMode) {
      return this.getStatusText(contract.status);
    }

    const { editedContracts } = this.state;
    const statusOptions = this.getStatusOptions();
    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;
    const value = editedContract.status;
    
    return (
      <Dropdown
        fluid
        selection
        value={ value }
        options={ statusOptions }
        onChange={ this.editContractStatus(editedContract) }
      />
    );
  }

  /**
   * Method for rendering contract quantity
   *
   * @param contract contract
   */
  private renderEditableQuantity = (contract: Contract) => {
    const { tableEditMode } = this.state;

    if (!tableEditMode) {
      return contract.contractQuantity;
    }

    const { editedContracts } = this.state;
    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;
    const value = editedContract.contractQuantity;

    return (
      <Input
        fluid
        value={ value }
        onChange={ this.editContractQuantity(editedContract) }
      />
    );
  }

  /**
   * Method for rendering contract remark
   *
   * @param contract contract
   */
  private renderEditableRemark = (contract: Contract) => {
    const { tableEditMode } = this.state;

    if (!tableEditMode) {
      return contract.remarks;
    }

    const { editedContracts } = this.state;
    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;
    const value = editedContract.remarks;

    return (
      <TextArea
        fluid
        value={ value }
        onChange={ this.editContractRemark(editedContract) }
      />
    );
  }

  /**
   * Method for editing contract status
   *
   * @param contract contract
   */
  private editContractStatus = (contract: Contract) => (event: React.ChangeEvent<HTMLElement>, data: DropdownProps) => {
    const { editedContracts } = this.state;

    const value = this.getStatus(String(data.value));

    if (editedContracts.includes(contract) && value) {
      contract.status = value;
      this.setState({ editedContracts: [...editedContracts] });
    } else if (value) {
      this.setState({
        editedContracts: [
          ...editedContracts,
          {
            ...contract,
            status: value
          }
        ]
      });
    }
  }

  /**
   * Method for editing contract quantity
   *
   * @param contract contract
   */
  private editContractQuantity = (contract: Contract) => (event: React.SyntheticEvent<HTMLInputElement>, data: InputOnChangeData) => {
    const { editedContracts } = this.state;

    const value = parseInt(data.value) || 0;

    if (editedContracts.includes(contract)) {
      contract.contractQuantity = value;
      this.setState({ editedContracts: [...editedContracts] });
    } else {
      this.setState({
        editedContracts: [
          ...editedContracts,
          {
            ...contract,
            contractQuantity: value
          }
        ]
      });
    }
  }

  /**
   * Method for editing contract remark
   *
   * @param contract contract
   */
  private editContractRemark = (contract: Contract) =>  (event: React.FormEvent<HTMLTextAreaElement>, data: TextAreaProps) => {
    const { editedContracts } = this.state;

    const value = String(data.value);

    if (editedContracts.includes(contract)) {
      contract.remarks = value;
      this.setState({ editedContracts: [...editedContracts] });
    } else {
      this.setState({
        editedContracts: [
          ...editedContracts,
          {
            ...contract,
            remarks: value
          }
        ]
      });
    }
  }

  /**
   * Method for toggling table edit mode state
   */
  private toggleTableEditMode = () => {
    const { tableEditMode } = this.state;

    this.setState({
      editedContracts: [],
      tableEditMode: !tableEditMode
    });
  }

  /**
   * Method for saving table after editing
   */
  private saveTable = async () => {
    const { keycloak } = this.props;
    const { editedContracts, contracts } = this.state;

    if (!keycloak || !keycloak.token) {
      return;
    }

    try {
      const contractsService = Api.getContractsService(keycloak.token);

      const promises = editedContracts.map(contract => 
        contractsService.updateContract(contract, contract.id || "")
      );
      
      const updatedContracts = await Promise.all(promises);

      const allContracts = contracts.map(contract => {
        const updatedContract = updatedContracts.find(item => item.id === contract.id);
        return updatedContract || contract;
      });

      this.setState({
        editedContracts: [],
        tableEditMode: false,
        contracts: allContracts
      });
    } catch (error) {
      console.error("Could not update contracts: ", error);
      this.setState({
        editedContracts: [],
        tableEditMode: false
      });
    }
  }
  
  /**
   * Handle item group change
   * 
   * @param value value
   */
  private handleItemGroupChange = (value: string) => {
    const filters = { ... this.state.filters };
    filters.itemGroupId = value;
    this.setState({ filters, offset: 0 });
    this.loadData();
  }

  /**
   * Handle year change
   * 
   * @param value value
   */
  private handleYearChange = (value: string) => {
    const filters = { ... this.state.filters };
    filters.year = value ? parseInt(value) : undefined;
    this.setState({ filters, offset: 0 });
    this.loadData();
  }

  /**
   * Handle status change
   * 
   * @param value value
   */
  private handleStatusChange = (value: ContractStatus) => {
    const filters = { ... this.state.filters };
    filters.status = value;
    this.setState({ filters, offset: 0 });
    this.loadData();
  }

  /**
   * Method for getting status options
   */
  private getStatusOptions = (): DropdownItemProps[] => {
    return [{
      key: "APPROVED",
      value: "APPROVED",
      text: this.getStatusText("APPROVED")
    }, {
      key: "ON_HOLD",
      value: "ON_HOLD",
      text: this.getStatusText("ON_HOLD")
    }, {
      key: "DRAFT",
      value: "DRAFT",
      text: this.getStatusText("DRAFT")
    }, {
      key: "TERMINATED",
      value: "TERMINATED",
      text: this.getStatusText("TERMINATED")
    }, {
      key: "REJECTED",
      value: "REJECTED",
      text: this.getStatusText("REJECTED")
    }];
  }

  /**
   * Get status text
   */
  private getStatusText = (statusEnum: ContractStatus) => {
    switch (statusEnum) {
      case "APPROVED":
        return strings.approved;
      case "DRAFT":
        return strings.draft;
      case "ON_HOLD":
        return strings.onHold;
      case "REJECTED":
        return strings.rejected;
      case "TERMINATED":
        return strings.terminated;
    }
  }

  /**
   * Method for getting status with status string
   *
   * @param status status string
   * @returns contract status enum or void
   */
  private getStatus = (status: string): ContractStatus | undefined => {
    switch (status) {
      case "APPROVED":
        return ContractStatus.APPROVED;
      case "DRAFT":
        return ContractStatus.DRAFT;
      case "ON_HOLD":
        return ContractStatus.ONHOLD;
      case "REJECTED":
        return ContractStatus.REJECTED;
      case "TERMINATED":
        return ContractStatus.TERMINATED;
      default:
        return;
    }
  }

  /**
   * Get xlsx
   */
  private getXlsx = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    this.setState({ 
      contractsLoading: true
    });

    const query: FilterContracts = {
      listAll: "true",
      firstResult: 0,
      maxResults: 999
    };

    if (this.state.filters.itemGroupId) {
      query.itemGroupId = this.state.filters.itemGroupId;
    }

    if (this.state.filters.year) {
      query.year = this.state.filters.year;
    }

    if (this.state.filters.status) {
      query.status = this.state.filters.status;
    }

    const response = await fetch(`${process.env.REACT_APP_API_URL}/rest/v1/contracts?${this.parseQuery(query)}`, {
      headers: {
        "Authorization": `Bearer ${this.props.keycloak.token}`,
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      method: "GET"
    });

    const blob = await response.blob();

    FileUtils.downloadBlob(blob, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contracts.xlsx");
    this.setState({ 
      contractsLoading: false
    });
  }

  /**
   * Download contract as pdf
   */
  private getPdf = async (contract: Contract, itemGroup: ItemGroup) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contract.id || !itemGroup || !itemGroup.id) {
      return;
    }
    
    this.setState({ 
      contractsLoading: true
    });

    const contractsService = await Api.getContractsService(this.props.keycloak.token);

    let documentTemplate: ContractDocumentTemplate = await contractsService.findContractDocumentTemplate(contract.id, "");
    documentTemplate = documentTemplate[0];
    let type: string = "";
    if (documentTemplate) {
      type = documentTemplate.type;
    } else {
      const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
      let documentTemplate: ItemGroupDocumentTemplate = await documentTemplateService.findItemGroupDocumentTemplate(itemGroup.id, "") || {};
      documentTemplate = documentTemplate[0];
      type = documentTemplate.type || "";
    }

    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData: Response = await pdfService.getPdf(contract.id, type);
    this.downloadPdfBlob(pdfData, type, contract);

    this.setState({ 
      contractsLoading: false
    });
  }

  /**
   * Method for opening file listing
   */
  private openFileListing = () => {
    const input = this.xlsxInput.current;

    if (!input) {
      return;
    }

    input.click();
  }

  /**
   * Method for importing xlsx file
   *
   * @param event event object
   */
  private importXlsx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    event.target.value = "";

    if (!file) {
      return;
    }

    this.setState({ xlsxPreviewOpen: true });
    this.setState({ parsedXlsxObjects: await this.parseXlsxFile(file) });
  }

  /**
   * Method for parsing xlsx file
   *
   * @param file file
   * @returns promise of conract preview data array
   */
  private parseXlsxFile = async (file: File): Promise<ContractPreviewData[]> => {
    const { keycloak } = this.props;

    if (!keycloak || !keycloak.token) {
      return Promise.reject();
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      const requestUrl = `${ process.env.REACT_APP_API_URL }/rest/v1/contractPreviews`;
      const response = await fetch(requestUrl, {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${ keycloak.token }`
        }
      });
      return await response.json();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Method for creating list of contracts to api
   *
   * @param contracts contract array
   */
  private createContracts = async (contracts: Contract[]) => {
    const { keycloak } = this.props;

    if (!keycloak || !keycloak.token) {
      return;
    }

    try {
      const contractsService = Api.getContractsService(keycloak.token);
      const promises = contracts.map(contract =>
        contractsService.createContract(contract)
      );

      const createdContracts = await Promise.all(promises);

      this.setState({
        xlsxPreviewOpen: false,
        contracts: [ ...createdContracts, ...this.state.contracts ]
      });
      await this.loadContacts(this.state.contracts);
    } catch (error) {
      console.log(`Couldn't create contracts: ${error}`);
    }
  }

  /**
   * Method for cancelling xlsx parsed contracts
   */
  private cancelXlsxContracts = () => {
    this.setState({
      parsedXlsxObjects: [],
      xlsxPreviewOpen: false
    });
  }
  
  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = async (pdfData: Response, downloadTitle: string, contract: Contract) => {
    const blob = await pdfData.blob();  
    FileUtils.downloadBlob(blob, "application/pdf", `${contract.id}-${downloadTitle}.pdf`);
  }

  /**
   * Parse query
   * 
   * @param query query
   */
  private parseQuery(query: FilterContracts) {
    return Object.keys(query).map(function (key) {
      return `${key}=${query[key]}`;
    }).join('&');
  }

  /**
   * Handle page change
   * 
   * @param type type
   */
  private handlePageChange = (type: string) => {
    const offset = this.state.offset;
    const contractsLength = this.state.contractsLength;
    const maxLimit = this.state.filters.maxResults;

    if (type == "NEXT" && contractsLength == maxLimit) {
      this.setState({ offset: offset + this.state.limit });
      this.loadData();
    } else if (type == "PREVIOUS" && offset > 0) {
      this.setState({ offset: offset - this.state.limit });
      this.loadData();
    }
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.errorMessage) {
      return (
        <BasicLayout>
          <ErrorMessage
            errorMessage={this.state.errorMessage}
          />
        </BasicLayout>
      );
    }

    if (this.state.contractsLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              {strings.loading}
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    const itemGroupOptions = Object.values(this.state.itemGroups).map((itemGroup) => {
      return {
        key: itemGroup.id,
        value: itemGroup.id,
        text: itemGroup.name
      };
    });

    const yearOptions = [];
    for (let i = moment().year(); i >= (moment().year() - 10); i--) {
      yearOptions.push({
        key: i,
        value: i,
        text: i
      });
    }

    const statusOptions = this.getStatusOptions();

    return (
      <TableBasicLayout>
        <Header floated='left' className="contracts-header">
          <p>{strings.contracts}</p>
        </Header>
        <Form style={{ width: "100%", clear: "both" }}>
          <Form.Group widths='equal'>
            <Form.Field>
              {this.renderDropDown(itemGroupOptions, this.state.filters.itemGroupId || "", this.handleItemGroupChange, "Valitse marjalaji")}
            </Form.Field>
            <Form.Field>
              {this.renderDropDown(yearOptions, this.state.filters.year || "", this.handleYearChange, "Vuosi")}
            </Form.Field>
            <Form.Field>
              {this.renderDropDown(statusOptions, this.state.filters.status || "", this.handleStatusChange, "Tila")}
            </Form.Field>
            <Form.Field>
              <Button onClick={this.getXlsx} color="grey">{strings.downloadXLSX}</Button>
              <Button onClick={ this.openFileListing } color="grey">{ strings.importXlsx }</Button>
              <input
                type="file"
                accept=".xlsx"
                multiple={ false }
                ref={ this.xlsxInput }
                style={{ display: "none" }}
                onChange={ this.importXlsx }
              />
            </Form.Field>
          </Form.Group>
        </Form>
        <Form>
          <Form.Group>
            <Form.Field>
              { this.renderEditButtons() }
            </Form.Field>
          </Form.Group>
        </Form>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={1}>
                {strings.year}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.supplierName}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.status}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.itemGroup}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.contractAmount}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.deliveriedAmount}
              </Table.HeaderCell>
              <Table.HeaderCell width={1}>
                {strings.deliveryPlace}
              </Table.HeaderCell>
              <Table.HeaderCell width={2}>
                {strings.remarkField}
              </Table.HeaderCell>
              <Table.HeaderCell width={2}>
                <Button as={Link} to="createContract" color="red" style={{ width: "100%" }}>{strings.newContract}</Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.contracts.map((contract: Contract) => {
                const contact = this.findContact(contract.contactId);
                const itemGroup = this.findItemGroup(contract.itemGroupId);
                const deliveryPlace = this.findDeliveryPlace(contract.deliveryPlaceId);

                return (
                  <Table.Row key={contract.id}> 
                    <Table.Cell>
                      { contract.year }
                    </Table.Cell>
                    <Table.Cell>
                      { contact ? `${contact.displayName}` : "-" }
                    </Table.Cell>
                    <Table.Cell style={{ overflow: "visible" }}>
                      { this.renderEditableStatus(contract) }
                    </Table.Cell>
                    <Table.Cell>
                      { itemGroup ? itemGroup.displayName : ""}
                    </Table.Cell>
                    <Table.Cell>
                      { this.renderEditableQuantity(contract) }
                    </Table.Cell>
                    <Table.Cell>
                      { contract.deliveredQuantity}
                    </Table.Cell>
                    <Table.Cell>
                      { deliveryPlace ? deliveryPlace.name : ""}
                    </Table.Cell>
                    <Table.Cell>
                        { this.renderEditableRemark(contract) }
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <List.Content as={Link} to={`/watchContract/${ contract.id }`}>
                            <p className="plink">{strings.viewContract}</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/editContract/${ contract.id }`}>
                            <p className="plink">{strings.editContract}</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/editContractDocument/${ contract.id }`}>
                            <p className="plink">{strings.editContractTemplate}</p>
                          </List.Content>
                        </List.Item>
                        { !itemGroup ? null :  
                        <List.Item>
                          <List.Content>
                            <p className="plink" onClick={() => this.getPdf(contract, itemGroup)}>{ strings.contractTemplatePDF }</p>
                          </List.Content>
                        </List.Item> }
                      </List>
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
        <Grid>
          <Grid.Row>
            {
              this.state.offset > 0 &&
              <Grid.Column floated="left" width="3">
                <Button fluid onClick={() => this.handlePageChange("PREVIOUS")}>
                  <Icon name="arrow circle left" />
                  Edellinen sivu
              </Button>
              </Grid.Column>
            }
            {
              this.state.contractsLength == this.state.filters.maxResults &&
              <Grid.Column floated="right" width="3">
                <Button fluid onClick={() => this.handlePageChange("NEXT")}>
                  Seuraava sivu
                <Icon name="arrow circle right" />
                </Button>
              </Grid.Column>
            }
          </Grid.Row>
        </Grid>
        <XlsxContractsPreview
          open={ this.state.xlsxPreviewOpen }
          parsedXlsxObjects={ this.state.parsedXlsxObjects }
          onAccept={ this.createContracts }
          onCancel={ this.cancelXlsxContracts }
        />
      </TableBasicLayout>
    );
  }

  /**
   * Returns contact for an id
   * 
   * @param contactId id
   * @returns contact or undefined if not found
   */
  private findContact = (contactId?: string) => {
    return contactId ? this.state.contacts[contactId] : null;
  }

  /**
   * Returns itemGroup for an id
   * 
   * @param itemGroupId id
   * @returns itemGroup or undefined if not found
   */
  private findItemGroup = (itemGroupId?: string) => {
    return itemGroupId ? this.state.itemGroups[itemGroupId] : null;
  }

  /**
   * Returns deliveryPlace for an id
   * 
   * @param deliveryPlaceId id
   * @returns deliveryPlace or undefined if not found
   */
  private findDeliveryPlace = (deliveryPlaceId?: string) => {
    return deliveryPlaceId ? this.state.deliveryPlaces[deliveryPlaceId] : null;
  }

}

/**
 * Redux mapper for mapping store state to component props
 * 
 * @param state store state
 */
export function mapStateToProps(state: StoreState) {
  return {
    authenticated: state.authenticated,
    keycloak: state.keycloak
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(ContractManagementList);
