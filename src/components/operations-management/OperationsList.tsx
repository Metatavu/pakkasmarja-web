import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState, HttpErrorResponse } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { OperationReport, OperationType } from "pakkasmarja-client";
import { Table, Header, Dimmer, Loader, Grid, Button, Icon, Select, DropdownItemProps, DropdownProps } from "semantic-ui-react";
import * as moment from "moment";
import { Link } from "react-router-dom";
import ErrorMessage from "../generic/ErrorMessage";

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
  open: boolean,
  operationReports: OperationReport[],
  loading: boolean,
  firstResult: number,
  startOperation?: OperationType
}

const MAX_RESULTS = 25;

/**
 * Class component for Operations list
 */
class OperationsList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      operationReports: [],
      open: false,
      loading: true,
      firstResult: 0
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {    
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    await this.loadData();
  }

  /**
   * Component did update life-sycle event
   */
  public async componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.firstResult !== this.state.firstResult) {
      await this.loadData();
    }
  }

  /**
   * Load Operations
   */
  private loadData = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });    
    const operationReportsService = await Api.getOperationReportsService(this.props.keycloak.token);
    
    this.setState({
      operationReports: await operationReportsService.listOperationReports(undefined, undefined, undefined, this.state.firstResult, MAX_RESULTS),
      loading: false
    });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan toimenpiteitä
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }

    if (this.isHttpErrorResponse(this.state.operationReports)) {
      return this.renderErrorMessage(this.state.operationReports);
    }

    const typeOptions: DropdownItemProps[] = this.getOperationTypes().map((type) => {
      return {
        key: type,  
        text: this.formatReportType(type),
        value: type
      }
    });

    return (
      <BasicLayout>
        <Grid>
          <Grid.Row>
            <Grid.Column>
              <Header floated='left' className="contracts-header">
                <p>Toimenpiteet</p>
              </Header>
            </Grid.Column>
          </Grid.Row>
          <Grid.Row>
            <Grid.Column floated="left" width="8">
              Aloita toimenpide
            </Grid.Column>
            <Grid.Column floated="right" width="5">
              <Select style={{ width: "100%" }} placeholder={ "Valitse" } options={ typeOptions } onChange={ this.onStartOperationChange }/>
            </Grid.Column>
            <Grid.Column floated="right" width="3">            
              <Button fluid disabled={ !this.state.startOperation } onClick={() => this.onActionStartClick() }> Aloita </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={5}>
                Tyyppi
              </Table.HeaderCell>
              <Table.HeaderCell width={5}>
                Tila
              </Table.HeaderCell>
              <Table.HeaderCell width={4}>
                Aloitettu
              </Table.HeaderCell>
              <Table.HeaderCell width={2}>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.operationReports.map((operationReport: OperationReport) => {
                return (
                  <Table.Row key={operationReport.id}>
                    <Table.Cell>
                      { this.formatOperationReportType(operationReport) }
                    </Table.Cell>
                    <Table.Cell>
                      { this.formatOperationReportState(operationReport) }
                    </Table.Cell>
                    <Table.Cell>
                      { this.formatOperationStarted(operationReport) }
                    </Table.Cell>
                    <Table.Cell style={{ textAlign: "center" }}>
                      <Button as={Link} to={`operationsReports/${operationReport.id}`}> Näytä </Button>
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
              <Button fluid onClick={() => this.onPreviousPageClick() } disabled={ !(this.state.firstResult > 0) }>
                <Icon name="arrow circle left" />
                Edellinen sivu
              </Button>
            </Grid.Column>
            <Grid.Column floated="right" width="3">
              <Button fluid onClick={() => this.onNextPageClick() }>
                Seuraava sivu
                <Icon name="arrow circle right" />
              </Button>
            </Grid.Column>
          </Grid.Row>
        </Grid>
      </BasicLayout>
    );
  }

  /**
   * Check if object is http error response
   */
  private isHttpErrorResponse(object: OperationReport[] | HttpErrorResponse): object is HttpErrorResponse {
    return 'code' in object;
  }

  /**
   * Render error message
   * 
   * @param response http response
   */
  private renderErrorMessage = (response: HttpErrorResponse) => {
    let errorMessage = "Jokin meni pieleen. Yritä hetken kuluttua uudelleen.";
    if (response.code == 403) {
      errorMessage = "Sinulla ei ole oikeuksia tähän näkymään. Jos näin ei pitäisi olla, ole yhteydessä Pakkasmarjaan.";
    }

    return (
      <BasicLayout>
        <ErrorMessage errorMessage={errorMessage} />
      </BasicLayout>
    );

  }
  
  /**
   * Formats operation report type
   * 
   * @param operationReport operation report
   * @return formatted type
   */
  private formatOperationReportType(operationReport: OperationReport): string {
    return this.formatReportType(operationReport.type!);
  }

  /**
   * Returns available operation types
   * 
   * @return available operation types
   */
  private getOperationTypes(): OperationType[] {
    return [
      OperationType.ITEMGROUPDEFAULTDOCUMENTTEMPLATES,
      OperationType.SAPCONTACTSYNC,
      OperationType.SAPCONTRACTSAPIDSYNC,
      OperationType.SAPCONTRACTSYNC,
      OperationType.SAPDELIVERYPLACESYNC,
      OperationType.SAPITEMGROUPSYNC
    ];
  }

  /**
   * Formats operation report type
   * 
   * @param operationReport operation report
   * @return formatted type
   */
  private formatReportType(type: OperationType): string {
    switch (type) {
      case "ITEM_GROUP_DEFAULT_DOCUMENT_TEMPLATES":
        return "Marjalajien oletus sopimusmallit";
      case "SAP_CONTACT_SYNC":
        return "SAP Yhteystietojen synkronointi";
      case "SAP_CONTRACT_SAPID_SYNC":
        return "Synkronoi sopimusten SAP -tunnisteet";
      case "SAP_CONTRACT_SYNC":
        return "SAP sopimusten synkronointi";
      case "SAP_DELIVERY_PLACE_SYNC":
        return "SAP toimituspaikkojen synkronointi";
      case "SAP_ITEM_GROUP_SYNC":
        return "SAP marjalajien synkronointi";
    }
    
    return `Unknown type ${type}`;
  }

  /**
   * Formats operation report state
   * 
   * @param operationReport operation report
   * @return formatted state
   */
  private formatOperationReportState(operationReport: OperationReport): string {
    const pendingCount = operationReport.pendingCount || 0;
    const successCount = operationReport.successCount || 0;
    const failedCount = operationReport.failedCount || 0;
    
    if (pendingCount > 0) {
      return `Kesken (${failedCount + successCount} /  ${failedCount + successCount + pendingCount})`;
    }

    if (successCount > 0 && failedCount > 0) {
      return `Sisältää virheitä (${successCount} / ${failedCount + successCount})`
    }

    if (successCount === 0 && failedCount > 0) {
      return "Epäonnistunut";
    }
    
    return "Onnistunut";
  }

  /**
   * Formats operation report start time
   * 
   * @param operationReport operation report
   * @return formatted start time
   */
  private formatOperationStarted(operationReport: OperationReport): string {
    if (!operationReport.started) {
      return "Ei tiedossa";
    }

    return moment(operationReport.started).locale("fi").format("LLL");
  }

  /**
   * Previous page button click handler
   */
  private onPreviousPageClick() {
    const firstResult = this.state.firstResult - MAX_RESULTS
    this.setState({
      firstResult: firstResult > 0 ? firstResult : 0
    });
  }

  /**
   * Next page button click handler
   */
  private onNextPageClick() {
    this.setState({
      firstResult: this.state.firstResult + MAX_RESULTS
    });
  }

  /**
   * Change handler for operation select change
   */
  private onStartOperationChange = (event: React.SyntheticEvent<HTMLElement>, data: DropdownProps) => {
    this.setState({
      startOperation: data.value as OperationType
    });
  }

  /**
   * Start operation button click handler
   */
  private onActionStartClick = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.startOperation) {
      return;
    }

    const type = this.state.startOperation;

    this.setState({ 
      loading: true,
      startOperation: undefined 
    });

    const operationsService = await Api.getOperationsService(this.props.keycloak.token);

    await operationsService.createOperation({
      type: type
    });

    await this.loadData();
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

export default connect(mapStateToProps, mapDispatchToProps)(OperationsList);
