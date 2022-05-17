import * as React from "react";
import * as _ from "lodash";
import { StoreState, HttpErrorResponse, FilterContracts } from "src/types";
import { connect } from "react-redux";
import "../../styles/common.css";
import "./styles.css";
import Api, { Contract, Contact, DeliveryPlace, ContractStatus, ContractPreviewData } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button, Dropdown, Form, List, Dimmer, Loader, Grid, Icon, Input, TextArea, DropdownProps, InputOnChangeData, TextAreaProps, DropdownItemProps } from "semantic-ui-react";
import ErrorMessage from "../generic/ErrorMessage";
import { Table } from "semantic-ui-react";
import { Link } from "react-router-dom";
import * as moment from "moment";
import TableBasicLayout from "../contract-management/TableBasicLayout";
import BasicLayout from "../generic/BasicLayout";
import strings from "src/localization/strings";
import { PDFService } from "src/api/pdf.service";
import FileUtils from "src/utils/FileUtils";
import XlsxContractsPreview from "./xlsx-contract-preview";
import AsyncButton from "../generic/asynchronous-button";

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
  contracts?: Contract[];
  itemGroups?: { [key: string]: ItemGroup };
  contacts?: { [key: string]: Contact };
  deliveryPlaces?: { [key: string]: DeliveryPlace };
  contractsLoading: boolean;
  proposeContractModalOpen: boolean;
  selectedBerry: string;
  proposedContractQuantity: string;
  proposedContractQuantityComment: string;
  proposeContractModalType: string;
  errorMessage?: string;
  filters: FilterContracts;
  offset: number;
  limit: number;
  contractsLength: number;
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
        maxResults: 50
      },
      offset: 0,
      limit: 50,
      contractsLength: 0
    };
  }

  /**
   * Component did mount life cycle event
   */
  public async componentDidMount() {
    this.loadData();
  }

  /**
   * Component did update life cycle method
   */
  public componentDidUpdate = (_: Props, prevState: State) => {
    if (JSON.stringify(prevState.filters) !== JSON.stringify(this.state.filters)) {
      this.loadData();
    }
  }

  /**
   * Load data
   */
  private loadData = async () => {
    const { keycloak } = this.props;

    if (!keycloak?.token) return;

    this.setState({
      contractsLoading: true,
      errorMessage: undefined,
      contracts: []
    });

    try {
      const [ contracts, itemGroups, deliveryPlaces, contacts ] = await Promise.all([
        this.loadContracts(),
        this.loadItemGroups(),
        this.loadDeliveryPlaces(),
        this.loadContacts()
      ]);

      this.setState({
        contractsLength: contracts.length,
        contractsLoading: false,
        contracts: contracts,
        itemGroups: itemGroups,
        deliveryPlaces: deliveryPlaces,
        contacts: contacts
      });
    } catch (error) {
      this.renderErrorMessage(error);
      console.error("Error fetching contract data. Reason: ", error);
    }
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
   * Loads contracts
   */
  private loadContracts = async () => {
    const { keycloak } = this.props;
    const { filters, offset, limit } = this.state;

    if (!keycloak?.token) {
      throw new Error("No access token");
    }

    return Api.getContractsService(keycloak.token).listContracts(
      "application/json",
      true,
      undefined,
      filters.itemGroupId,
      filters.year,
      filters.status,
      offset,
      limit
    )
  };

  /**
   * Load item groups
   */
  private loadItemGroups = async () => {
    const { keycloak } = this.props;
    const { itemGroups } = this.state;

    if (!keycloak?.token) {
      throw new Error("No access token");
    }

    return itemGroups ?? _.keyBy(
      await Api.getItemGroupsService(keycloak.token).listItemGroups(),
      "id"
    );
  }

  /**
   * Load delivery places
   */
  private loadDeliveryPlaces = async () => {
    const { keycloak } = this.props;
    const { deliveryPlaces } = this.state;

    if (!keycloak?.token) {
      throw new Error("No access token");
    }

    return deliveryPlaces ?? _.keyBy(
      await Api.getDeliveryPlacesService(keycloak.token).listDeliveryPlaces(),
      "id"
    );
  }

  /**
   * Loads contacts for given contracts into the state
   *
   * @param contracts
   */
  private loadContacts = async () => {
    const { keycloak } = this.props;
    const { contacts } = this.state;

    if (!keycloak?.token) {
      throw new Error("No access token");
    }

    return contacts ?? _.keyBy(
      await Api.getContactsService(keycloak.token).listContacts(),
      "id"
    );
  }

  /**
   * Render drop down
   *
   * @param options options
   * @param value value
   * @param onChange onChange function
   * @param placeholder placeholder
   */
  private renderDropDown = (
    options: any,
    value: string | number,
    onChange: (value: string) => void,
    placeholder: string
  ) => {
    if (!options.length) {
      return <Dropdown fluid/>;
    }

    return (
      <Dropdown
        fluid
        placeholder={ placeholder }
        selection
        value={ value }
        options={ [{ key: placeholder, value: undefined, text: placeholder }].concat(options) }
        onChange={ (event, data) => onChange(data.value as string) }
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
        <Button onClick={ this.toggleTableEditMode }>
          { strings.editMode }
        </Button>
      );
    }

    return (
      <>
        <AsyncButton onClick={ this.saveTable } color="red">
          { strings.save }
        </AsyncButton>
        <Button onClick={ this.toggleTableEditMode }>
          { strings.cancel }
        </Button>
      </>
    );
  }

  /**
   * Method for rendering contract status
   *
   * @param contract contract
   */
  private renderEditableStatus = (contract: Contract) => {
    const { tableEditMode, editedContracts } = this.state;

    if (!tableEditMode) {
      return this.getStatusText(contract.status);
    }

    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;

    return (
      <Dropdown
        fluid
        selection
        value={ editedContract.status }
        options={ this.getStatusOptions() }
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
    const { tableEditMode, editedContracts } = this.state;

    if (!tableEditMode) {
      return contract.contractQuantity;
    }

    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;

    return (
      <Input
        fluid
        value={ editedContract.contractQuantity }
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
    const { tableEditMode, editedContracts } = this.state;

    if (!tableEditMode) {
      return contract.remarks;
    }

    const editedContract = editedContracts.find(item => item.id === contract.id) || contract;

    return (
      <TextArea
        fluid
        value={ editedContract.remarks }
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
      this.setState({ editedContracts: [ ...editedContracts ] });
    } else if (value) {
      this.setState({
        editedContracts: [
          ...editedContracts,
          { ...contract, status: value }
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
      this.setState({ editedContracts: [ ...editedContracts ] });
    } else {
      this.setState({
        editedContracts: [
          ...editedContracts,
          { ...contract, contractQuantity: value }
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
      this.setState({ editedContracts: [ ...editedContracts ] });
    } else {
      this.setState({
        editedContracts: [
          ...editedContracts,
          { ...contract, remarks: value }
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

    if (!keycloak?.token) return;

    try {
      const contractsService = Api.getContractsService(keycloak.token);

      const updateContractPromises = editedContracts.map(contract =>
        contractsService.updateContract(contract, contract.id || "")
      );

      const updatedContracts = await Promise.all(updateContractPromises);

      const allContracts = (contracts || []).map(contract =>
        updatedContracts.find(item => item.id === contract.id) ?? contract
      );

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
    this.setState({
      filters: {
        ...this.state.filters,
        itemGroupId: value
      },
      offset: 0
    });
  }

  /**
   * Handle year change
   *
   * @param value value
   */
  private handleYearChange = (value: string) => {
    this.setState({
      filters: {
        ...this.state.filters,
        year: value ? parseInt(value) : undefined
      },
      offset: 0
    });
  }

  /**
   * Handle status change
   *
   * @param value value
   */
  private handleStatusChange = (value: ContractStatus) => {
    this.setState({
      filters: {
        ...this.state.filters,
        status: value
      },
      offset: 0
    });
  }

  /**
   * Method for getting status options
   *
   * @returns list of dropdown item properties
   */
  private getStatusOptions = (): DropdownItemProps[] => {
    return [ "APPROVED", "ON_HOLD", "DRAFT", "TERMINATED", "REJECTED" ].map((status: ContractStatus) => ({
      key: status,
      value: status,
      text: this.getStatusText(status)
    }));
  }

  /**
   * Get localized status text
   *
   * @param status status
   * @returns status as localized text
   */
  private getStatusText = (status: ContractStatus) => ({
    "APPROVED": strings.approved,
    "DRAFT": strings.draft,
    "ON_HOLD": strings.onHold,
    "REJECTED": strings.rejected,
    "TERMINATED": strings.terminated
  })[status];

  /**
   * Method for getting status with status string
   *
   * @param status status string
   * @returns contract status enum or undefined
   */
  private getStatus = (status: string): ContractStatus | undefined => ({
    "APPROVED": ContractStatus.APPROVED,
    "DRAFT": ContractStatus.DRAFT,
    "ON_HOLD": ContractStatus.ONHOLD,
    "REJECTED": ContractStatus.REJECTED,
    "TERMINATED": ContractStatus.TERMINATED
  })[status];

  /**
   * Get xlsx
   */
  private getXlsx = async () => {
    const { keycloak } = this.props;
    const { filters } = this.state;

    if (!keycloak?.token) return;

    this.setState({ contractsLoading: true });

    const query: FilterContracts = {
      listAll: "true",
      firstResult: 0,
      maxResults: 9999
    };

    if (filters.itemGroupId) {
      query.itemGroupId = filters.itemGroupId;
    }

    if (filters.year) {
      query.year = filters.year;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const response = await fetch(`${process.env.REACT_APP_API_URL}/rest/v1/contracts?${this.parseQuery(query)}`, {
      headers: {
        "Authorization": `Bearer ${keycloak.token}`,
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      method: "GET"
    });

    const blob = await response.blob();

    FileUtils.downloadBlob(blob, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "contracts.xlsx");

    this.setState({ contractsLoading: false });
  }

  /**
   * Download contract as pdf
   *
   * @param contract contract
   * @param itemGroup item group
   */
  private getPdf = async (contract: Contract, itemGroup: ItemGroup) => {
    const { keycloak } = this.props;

    if (!keycloak?.token || !contract.id || !itemGroup?.id) {
      return;
    }

    this.setState({ contractsLoading: true });

    const type = contract.year.toString();

    const pdfData: Response = await new PDFService(
      process.env.REACT_APP_API_URL || "",
      keycloak.token
    ).getPdf(contract.id, type);

    this.downloadPdfBlob(pdfData, type, contract);

    this.setState({ contractsLoading: false });
  }

  /**
   * Method for opening file listing
   */
  private openFileListing = () => {
    this.xlsxInput.current?.click();
  }

  /**
   * Method for importing xlsx file
   *
   * @param event event object
   */
  private importXlsx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.item(0);
    event.target.value = "";

    if (!file) return;

    this.setState({
      xlsxPreviewOpen: true,
      parsedXlsxObjects: await this.parseXlsxFile(file)
    });
  }

  /**
   * Method for parsing xlsx file
   *
   * @param file file
   * @returns promise of contract preview data array
   */
  private parseXlsxFile = async (file: File): Promise<ContractPreviewData[]> => {
    const { keycloak } = this.props;

    if (!keycloak?.token) {
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

    if (!keycloak?.token) return;

    try {
      const contractsService = Api.getContractsService(keycloak.token);
      const createdContracts = await Promise.all(
        contracts.map(contract => contractsService.createContract(contract))
      );

      this.setState({
        xlsxPreviewOpen: false,
        contracts: [ ...createdContracts, ...(this.state.contracts || []) ]
      });
    } catch (error) {
      console.log(`Could not create contracts: ${error}`);
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
   * Download PDF file to user device
   *
   * @param pdfData pdf data
   * @param downloadTitle download title
   * @param contract contract
   */
  private downloadPdfBlob = async (pdfData: Response, downloadTitle: string, contract: Contract) => {
    FileUtils.downloadBlob(
      await pdfData.blob(),
      "application/pdf",
      `${contract.id}-${downloadTitle}.pdf`
    );
  }

  /**
   * Parse HTML query string from filters
   *
   * @param filters filters
   */
  private parseQuery(filters: FilterContracts) {
    return Object.keys(filters).map(key => `${key}=${filters[key]}`).join("&");
  }

  /**
   * Handle page change
   *
   * @param type type
   */
  private handlePageChange = (type: string) => {
    const { offset, contractsLength, filters, limit } = this.state;

    if (type === "NEXT" && contractsLength >= filters.maxResults) {
      this.setState({ offset: offset + limit });
      this.loadData();
    } else if (type === "PREVIOUS" && offset > 0) {
      this.setState({ offset: offset - limit });
      this.loadData();
    }
  }

  /**
   * Render method
   */
  public render() {
    const {
      contractsLoading,
      errorMessage,
      itemGroups,
      filters,
      offset,
      contracts,
      contractsLength,
      xlsxPreviewOpen,
      parsedXlsxObjects
    } = this.state;

    if (errorMessage) {
      return (
        <BasicLayout>
          <ErrorMessage errorMessage={ errorMessage }/>
        </BasicLayout>
      );
    }

    if (contractsLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              { strings.loading }
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    const itemGroupOptions = Object
      .values(itemGroups || [])
      .map(({ id, name }) => ({ key: id, value: id, text: name }));

    const yearOptions = [];
    const year = moment().year();

    for (let i = year; i >= (year - 10); i--) {
      yearOptions.push({ key: i, value: i, text: i });
    }

    const statusOptions = this.getStatusOptions();

    return (
      <TableBasicLayout>
        <Header floated="left" className="contracts-header">
          <p>{ strings.contracts }</p>
        </Header>
        <Form style={{ width: "100%", clear: "both" }}>
          <Form.Group widths="equal">
            <Form.Field>
              {
                this.renderDropDown(
                  itemGroupOptions,
                  filters.itemGroupId || "",
                  this.handleItemGroupChange,
                  "Valitse marjalaji"
                )
              }
            </Form.Field>
            <Form.Field>
              {
                this.renderDropDown(
                  yearOptions,
                  filters.year || "",
                  this.handleYearChange,
                  "Vuosi"
                )
              }
            </Form.Field>
            <Form.Field>
              {
                this.renderDropDown(
                  statusOptions,
                  filters.status || "",
                  this.handleStatusChange,
                  "Tila"
                )
              }
            </Form.Field>
            <Form.Field>
              <AsyncButton onClick={ this.getXlsx } color="grey">
                { strings.downloadXLSX }
              </AsyncButton>
              <Button onClick={ this.openFileListing } color="grey">
                { strings.importXlsx }
              </Button>
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
        <Table
          celled
          fixed
          unstackable
        >
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={ 1 }>
                { strings.year }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.supplierName }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.status }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.itemGroup }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.proposedAmount }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.contractAmount }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.deliveredAmount }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 1 }>
                { strings.deliveryPlace }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 2 }>
                { strings.remarkField }
              </Table.HeaderCell>
              <Table.HeaderCell width={ 2 }>
                <Button
                  as={ Link }
                  to="createContract"
                  color="red"
                  style={{ width: "100%" }}
                >
                  { strings.newContract }
                </Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              contracts?.map(contract => {
                const contact = this.findContact(contract.contactId);
                const itemGroup = this.findItemGroup(contract.itemGroupId);
                const deliveryPlace = this.findDeliveryPlace(contract.deliveryPlaceId);

                return (
                  <Table.Row key={ contract.id }>
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
                      { itemGroup?.displayName ?? "" }
                    </Table.Cell>
                    <Table.Cell>
                      { contract.proposedQuantity ?? "" }
                    </Table.Cell>
                    <Table.Cell>
                      { this.renderEditableQuantity(contract) }
                    </Table.Cell>
                    <Table.Cell>
                      { contract.deliveredQuantity }
                    </Table.Cell>
                    <Table.Cell>
                      { deliveryPlace?.name ?? "" }
                    </Table.Cell>
                    <Table.Cell>
                        { this.renderEditableRemark(contract) }
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <List.Content as={ Link } to={ `/watchContract/${ contract.id }` }>
                            <p className="plink">
                              { strings.viewContract }
                            </p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={ Link } to={ `/editContract/${ contract.id }` }>
                            <p className="plink">
                              { strings.editContract }
                            </p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={ Link } to={ `/editContractDocument/${ contract.id }` }>
                            <p className="plink">
                              { strings.editContractTemplate }
                            </p>
                          </List.Content>
                        </List.Item>
                        { !itemGroup ? null :
                        <List.Item>
                          <List.Content>
                            <p className="plink" onClick={ () => this.getPdf(contract, itemGroup) }>
                              { strings.contractTemplatePDF }
                            </p>
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
              offset > 0 &&
              <Grid.Column floated="left" width="3">
                <Button fluid onClick={ () => this.handlePageChange("PREVIOUS") }>
                  <Icon name="arrow circle left"/>
                  Edellinen sivu
              </Button>
              </Grid.Column>
            }
            {
              contractsLength >= filters.maxResults &&
              <Grid.Column floated="right" width="3">
                <Button fluid onClick={ () => this.handlePageChange("NEXT") }>
                  Seuraava sivu
                <Icon name="arrow circle right"/>
                </Button>
              </Grid.Column>
            }
          </Grid.Row>
        </Grid>
        <XlsxContractsPreview
          open={ xlsxPreviewOpen }
          parsedXlsxObjects={ parsedXlsxObjects }
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
    const { contacts } = this.state;
    return contactId ? (contacts || {})[contactId] : null;
  }

  /**
   * Returns itemGroup for an id
   *
   * @param itemGroupId id
   * @returns itemGroup or undefined if not found
   */
  private findItemGroup = (itemGroupId?: string) => {
    const { itemGroups } = this.state;
    return itemGroupId ? (itemGroups || {})[itemGroupId] : null;
  }

  /**
   * Returns deliveryPlace for an id
   *
   * @param deliveryPlaceId id
   * @returns deliveryPlace or undefined if not found
   */
  private findDeliveryPlace = (deliveryPlaceId?: string) => {
    const { deliveryPlaces } = this.state;
    return deliveryPlaceId ? (deliveryPlaces || {})[deliveryPlaceId] : null;
  }
}

/**
 * Redux mapper for mapping store state to component props
 *
 * @param state store state
 */
const mapStateToProps = (state: StoreState) => ({
  authenticated: state.authenticated,
  keycloak: state.keycloak
});

export default connect(mapStateToProps)(ContractManagementList);
