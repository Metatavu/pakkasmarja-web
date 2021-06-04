import * as React from "react";
import * as actions from "../../actions/";
import BasicLayout from "../generic/BasicLayout";
import { StoreState } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import Api, { OperationReportItem, OperationReport } from "pakkasmarja-client";
import { Table, Header, Dimmer, Loader, Button } from "semantic-ui-react";
import { Link } from "react-router-dom";
import { OperationUtils } from "../../utils/operations";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean,
  keycloak?: Keycloak.KeycloakInstance,
  match: any
}

/**
 * Interface for component state
 */
interface State {
  open: boolean,
  operationReport: OperationReport | null,
  operationReportItems: OperationReportItem[],
  loading: boolean,
  operationReportId: string
}

/**
 * Class component for Operations list
 */
class OperationReportComponent extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      operationReportItems: [],
      open: false,
      loading: true,
      operationReportId: "",
      operationReport: null
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({
      operationReportId: this.props.match.params.operationReportId
    });

    await this.load();
  }

  /**
   * Load Operations
   */
  private load = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });    
    const operationReportsService = await Api.getOperationReportsService(this.props.keycloak.token);

    this.setState({
      operationReport: await operationReportsService.findOperationReport(this.state.operationReportId),
      operationReportItems: await operationReportsService.listOperationReportItems(this.state.operationReportId),
      loading: false
    });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.loading || !this.state.operationReport) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan...
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
    }
    
    return (
      <BasicLayout>
        <Header floated='left' className="contracts-header">
          <p>Toimenpiteet { this.formatOperationReportType(this.state.operationReport) }</p>
        </Header>
        <Button as={Link} to={`/operationsManagement`} style={ {float: "right"} }> Takaisin </Button>
        <Table celled fixed unstackable>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell width={6}>
                Tila
              </Table.HeaderCell>
              <Table.HeaderCell width={12}>
                Viesti
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {
              this.state.operationReportItems.map((operationReportItem: OperationReportItem, index: number) => {
                return (
                  <Table.Row key={index}>
                    <Table.Cell>
                      { this.formatStatus(operationReportItem) }
                    </Table.Cell>
                    <Table.Cell>
                      { operationReportItem.message }
                    </Table.Cell>
                  </Table.Row>
                );
              })
            }
          </Table.Body>
        </Table>
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
    return OperationUtils.getReportDisplayName(operationReport.type!);
  }

  /**
   * Formats operation report item status
   * 
   * @param ooerationReportItem operation report item
   * @return formatted status
   */
  private formatStatus(ooerationReportItem: OperationReportItem): string {
    switch (ooerationReportItem.status) {
      case "FAILURE":
        return "Epäonnistunut";
      case "PENDING":
        return 'Odottaa';
      case "SUCCESS":
        return "Onnistunut";
    }
    
    return `Unknown status ${ooerationReportItem.status}`;
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

export default connect(mapStateToProps, mapDispatchToProps)(OperationReportComponent);
