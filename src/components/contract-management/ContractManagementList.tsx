import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, ContractManagementTableData, HttpErrorResponse, FilterContracts } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import "./styles.scss";
import Api, { Contract, Contact, DeliveryPlace, ContractDocumentTemplate, ItemGroupDocumentTemplate } from "pakkasmarja-client";
import { ItemGroup } from "pakkasmarja-client";
import { Header, Button, Dropdown, Form, List, Dimmer, Loader, Grid, Icon } from "semantic-ui-react";
import ErrorMessage from "../generic/ErrorMessage";
import { Table } from 'semantic-ui-react';
import Moment from 'react-moment';
import { Link } from "react-router-dom";
import * as moment from 'moment';
import TableBasicLayout from "../contract-management/TableBasicLayout";
import BasicLayout from "../generic/BasicLayout";
import { PDFService } from "src/api/pdf.service";
import strings from "src/localization/strings";

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
  keycloak?: Keycloak.KeycloakInstance;
  contractData: ContractManagementTableData[];
  itemGroups: ItemGroup[];
  contacts: Contact[];
  deliveryPlaces: DeliveryPlace[];
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
}

/**
 * Class for contract list component
 */
class ContractManagementList extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      contractData: [],
      itemGroups: [],
      contacts: [],
      deliveryPlaces: [],
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
      limit: 10
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

    this.setState({ contractsLoading: true, errorMessage: undefined, contractData: [] });

    const contractsService = await Api.getContractsService(this.props.keycloak.token);
    const contracts: Contract[] | HttpErrorResponse = await contractsService.listContracts("application/json", true, undefined, this.state.filters.itemGroupId, this.state.filters.year, this.state.filters.status, this.state.offset, this.state.limit);

    if (this.isHttpErrorResponse(contracts)) {
      this.renderErrorMessage(contracts);
      return;
    }

    await this.loadItemGroups();
    await this.loadDeliveryPlaces();

    await Promise.all(contracts.map((contract): Promise<any> => {
      return this.createContractManagementTableData(contract);
    }));

    this.setState({ contractsLoading: false });
  }

  /**
   * Get contract management table data
   * 
   * @param contracts contracts
   * @return table data
   */
  private createContractManagementTableData = async (contract: Contract) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const itemGroup = this.state.itemGroups.find(itemGroup => itemGroup.id === contract.itemGroupId);
    const deliveryPlace = this.state.deliveryPlaces.find(deliveryPlace => deliveryPlace.id === contract.deliveryPlaceId);
    let contact: Contact | undefined = this.state.contacts.find((stateContact) => stateContact.id === contract.contactId) 
    
    if (!contact) {
      const contactsService = await Api.getContactsService(this.props.keycloak.token);
      contact = await contactsService.findContact(contract.contactId || "");
      
      const contactsState: Contact[] = this.state.contacts;
      contactsState.push(contact);
      this.setState({ contacts: contactsState });
    }

    const contractsState: ContractManagementTableData[] = this.state.contractData;

    contractsState.push({
      contract: contract,
      itemGroup: itemGroup,
      contact: contact,
      deliveryPlace: deliveryPlace
    });

    this.setState({ contractData: contractsState });
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
    this.setState({ itemGroups: itemGroups });
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
    this.setState({ deliveryPlaces: deliveryPlaces });
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
   * Get filtered contract data
   * 
   * @return filtered contract data
   */
  private getFilteredContractData = () => {
    return this.state.contractData && this.state.contractData.filter((contractData) => {
      if (!contractData.contract || !contractData.itemGroup) {
        return false;
      }

      if (!this.state.filters.status && !this.state.filters.itemGroupId && !this.state.filters.year) {
        return true;
      }

      const filterYear = this.state.filters.year;
      const contractYear = contractData.contract.year;
      const filterItemGroup = this.state.filters.itemGroupId;
      const contractItemGroup = contractData.contract.itemGroupId;
      const filterStatus = this.state.filters.status;
      const contractStatus = contractData.contract.status;

      if (filterYear && filterYear !== contractYear) {
        return false;
      }

      if (filterItemGroup && filterItemGroup !== contractItemGroup) {
        return false;
      }

      if (filterStatus && filterStatus !== contractStatus) {
        return false;
      }

      return true;
    });
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
  private handleStatusChange = (value: Contract.StatusEnum) => {
    const filters = { ... this.state.filters };
    filters.status = value;
    this.setState({ filters, offset: 0 });
    this.loadData();
  }

  /**
   * Get status text
   */
  private getStatusText = (statusEnum: Contract.StatusEnum) => {
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
   * Get xlsx
   */
  private getXlsx = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const query: FilterContracts = {
      listAll: "true",
      firstResult: this.state.offset,
      maxResults: this.state.limit
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

    fetch(`${process.env.REACT_APP_API_URL}/rest/v1/contracts?${this.parseQuery(query)}`, {
      headers: {
        "Authorization": `Bearer ${this.props.keycloak.token}`,
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      },
      method: "GET"
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = "contracts.xlsx";
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  /**
   * Download contract as pdf
   */
  private getPdf = async (contractData: ContractManagementTableData) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !contractData.contract.id || !contractData.itemGroup || !contractData.itemGroup.id) {
      return;
    }
    const contractsService = await Api.getContractsService(this.props.keycloak.token);

    let documentTemplate: ContractDocumentTemplate = await contractsService.findContractDocumentTemplate(contractData.contract.id, "");
    documentTemplate = documentTemplate[0];
    let type: string = "";
    if (documentTemplate) {
      type = documentTemplate.type;
    } else {
      const documentTemplateService = await Api.getItemGroupsService(this.props.keycloak.token);
      let documentTemplate: ItemGroupDocumentTemplate = await documentTemplateService.findItemGroupDocumentTemplate(contractData.itemGroup.id, "") || {};
      documentTemplate = documentTemplate[0];
      type = documentTemplate.type || "";
    }

    const pdfService = new PDFService(process.env.REACT_APP_API_URL || "", this.props.keycloak.token);
    const pdfData: Response = await pdfService.getPdf(contractData.contract.id, type);
    this.downloadPdfBlob(pdfData, type, contractData.contract);
  }

  /**
   * Download pdf to users computer
   * 
   * @param pdfData pdf data
   */
  private downloadPdfBlob = (pdfData: Response, downloadTitle: string, contract: Contract) => {

    pdfData.blob().then((blob: Blob) => {
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const data = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = data;
      link.download = `${contract.id}-${downloadTitle}.pdf`;
      link.click();
      setTimeout(function () {
        window.URL.revokeObjectURL(data);
      }, 100);
    });
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

    if (type == "NEXT") {
       this.setState({ offset: offset + this.state.limit });
       this.loadData();
    } else if (type == "PREVIOUS") {
      if (offset >= 0) {
        this.setState({ offset: offset - this.state.limit });
        this.loadData();
      } 
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

    const itemGroupOptions = this.state.itemGroups.map((itemGroup) => {
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

    const statusOptions = [{
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
            </Form.Field>
          </Form.Group>
        </Form>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
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
                {strings.dates}
              </Table.HeaderCell>
              <Table.HeaderCell width={2}>
                <Button as={Link} to="createContract" color="red" style={{ width: "100%" }}>{strings.newContract}</Button>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.getFilteredContractData().map((contractData: ContractManagementTableData) => {
                return (
                  <Table.Row key={contractData.contract.id}>
                    <Table.Cell>
                      {contractData.contact ? contractData.contact.companyName : "-"}
                    </Table.Cell>
                    <Table.Cell>
                      {this.getStatusText(contractData.contract.status)}
                    </Table.Cell>
                    <Table.Cell>
                      {contractData.itemGroup ? contractData.itemGroup.displayName : ""}
                    </Table.Cell>
                    <Table.Cell>
                      {contractData.contract.contractQuantity}
                    </Table.Cell>
                    <Table.Cell>
                      {contractData.contract.deliveredQuantity}
                    </Table.Cell>
                    <Table.Cell>
                      {contractData.deliveryPlace ? contractData.deliveryPlace.name : ""}
                    </Table.Cell>
                    <Table.Cell  >
                      <div className="handleOverflow">{contractData.contract.remarks}</div>
                    </Table.Cell>
                    <Table.Cell>
                      <List>
                        <List.Item>
                          <List.Content>
                            {"Viljelijän allekirjoituspäivä: "}
                            {
                              contractData.contract.signDate !== null
                                ?
                                <Moment format="DD.MM.YYYY">
                                  {contractData.contract.signDate}
                                </Moment>
                                :
                                "  -"
                            }
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content>
                            {"Aloituspäivä: "}
                            {
                              contractData.contract.startDate !== null
                                ?
                                <Moment format="DD.MM.YYYY">
                                  {contractData.contract.startDate}
                                </Moment>
                                :
                                "  -"
                            }
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content>
                            {"Loppupäivä: "}
                            {
                              contractData.contract.endDate !== null
                                ?
                                <Moment format="DD.MM.YYYY">
                                  {contractData.contract.endDate}
                                </Moment>
                                :
                                "  -"
                            }
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content>
                            {"Pakkasmarjan hyväksyntäpäivä: "}
                            {
                              contractData.contract.termDate !== null
                                ?
                                <Moment format="DD.MM.YYYY">
                                  {contractData.contract.termDate}
                                </Moment>
                                :
                                " -"
                            }
                          </List.Content>
                        </List.Item>
                      </List>
                    </Table.Cell>
                    <Table.Cell >
                      <List>
                        <List.Item>
                          <List.Content as={Link} to={`/watchContract/${contractData.contract.id}`}>
                            <p className="plink">{strings.viewContract}</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/editContract/${contractData.contract.id}`}>
                            <p className="plink">{strings.editContract}</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content as={Link} to={`/editContractDocument/${contractData.contract.id}`}>
                            <p className="plink">{strings.editContractTemplate}</p>
                          </List.Content>
                        </List.Item>
                        <List.Item>
                          <List.Content>
                            <p className="plink" onClick={() => this.getPdf(contractData)}>{strings.contractTemplatePDF}</p>
                          </List.Content>
                        </List.Item>
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
            <Grid.Column floated="left" width="3">
              <Button fluid onClick={() => this.handlePageChange("PREVIOUS")}>
                <Icon name="arrow circle left" />
                Edellinen sivu
              </Button>
            </Grid.Column>
            <Grid.Column floated="right" width="3">
              <Button fluid onClick={() => this.handlePageChange("NEXT")}>
                Seuraava sivu
                <Icon name="arrow circle right" />
              </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </TableBasicLayout>
    );
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
