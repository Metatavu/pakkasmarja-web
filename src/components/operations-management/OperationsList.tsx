import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import Api, { OperationReport } from "pakkasmarja-client";
import { Table, Header, Dimmer, Loader, Grid, Button, Icon } from "semantic-ui-react";
import * as moment from "moment";

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
  openrationReports: OperationReport[],
  loading: boolean,
  firstResult: number
}

const MAX_RESULTS = 25;

/**
 * Class component for Operations list
 */
class OperationsList extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      openrationReports: [],
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

    await this.loadOperationReports();
  }

  /**
   * Component did update life-sycle event
   */
  public async componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.firstResult !== this.state.firstResult) {
      await this.loadOperationReports();
    }
  }

  /**
   * Load Operations
   */
  private loadOperationReports = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });    
    const operationReportsService = await Api.getOperationReportsService(this.props.keycloak.token);
    this.setState({
      openrationReports: await operationReportsService.listOperationReports(undefined, undefined, undefined, this.state.firstResult, MAX_RESULTS),
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
    
    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>Toimenpiteet</p>
        </Header>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={6}>
                Tyyppi
              </Table.HeaderCell>
              <Table.HeaderCell width={6}>
                Tila
              </Table.HeaderCell>
              <Table.HeaderCell width={4}>
                Aloitettu
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.openrationReports.map((operationReport: OperationReport) => {
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
   * Formats operation report type
   * 
   * @param operationReport operation report
   * @return formatted type
   */
  private formatOperationReportType(operationReport: OperationReport): string {
    switch (operationReport.type) {
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
    
    return `Unknown type ${operationReport.type}`;
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
