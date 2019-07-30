import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions";
import { StoreState } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Button, Dimmer, Loader, Table } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import Api, { DeliveryQuality, ItemGroupCategory } from "pakkasmarja-client";
import strings from "src/localization/strings";
import * as _ from "lodash";

/**
 * Interface for component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
};

/**
 * Interface for component state
 */
interface State {
  deliveryQualities: DeliveryQuality[];
  loading: boolean;
  redirect: boolean;
  selectedDeliveryQualityId?: string;
};

/**
 * Class for managing qualities
 */
class ManageQualities extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      deliveryQualities: [],
      loading: false,
      redirect: false
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    this.loadDeliveryQualities();
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.selectedDeliveryQualityId) {
      return <Redirect to={`/quality/${this.state.selectedDeliveryQualityId}`}/>;
    }

    if (this.state.redirect) {
      return <Redirect to='/' />;
    }

    if (this.state.loading) {
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

    return (
      <BasicLayout topBarButtonText={"+ Lisää uusi laatu"} onTopBarButtonClick={() => this.setState({ selectedDeliveryQualityId : "new" })}>
        <Header as="h3">
          Laatujen hallinta
        </Header>
        {this.renderTable()}
        <Button onClick={() => { this.setState({ redirect: true }) }} floated="right" color="red" inverted>Takaisin</Button>
      </BasicLayout>
    );
  }

  /**
   * Render table
   */
  private renderTable = () => {
    return (
      <Table celled fixed unstackable>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell textAlign="center" width={1}>
              Kategoria
              </Table.HeaderCell>
            <Table.HeaderCell width={2}>
              Näyttönimi (näkyvissä viljelijällä)
              </Table.HeaderCell>
            <Table.HeaderCell width={2}>
              Nimi (näkyvissä vastaanottajalla)
              </Table.HeaderCell>
            <Table.HeaderCell textAlign="center" width={1}>
              Hinta
              </Table.HeaderCell>
            <Table.HeaderCell textAlign="center" width={1}>
              Väri
              </Table.HeaderCell>
            <Table.HeaderCell width={1}>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            _.sortBy(this.state.deliveryQualities, quality => quality.itemGroupCategory).map((quality: DeliveryQuality) => {
              return (
                <Table.Row key={quality.id}>
                  <Table.Cell textAlign="center">
                    {this.renderCategory(quality.itemGroupCategory)}
                  </Table.Cell>
                  <Table.Cell>
                    {quality.displayName}
                  </Table.Cell>
                  <Table.Cell>
                    {quality.name}
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {`${quality.priceBonus} € / KG`}
                  </Table.Cell>
                  <Table.Cell style={{ backgroundColor: `${quality.color}` || "#FFF" }} textAlign="center">
                    {quality.color}
                  </Table.Cell>
                  <Table.Cell>
                    <Button fluid onClick={() => this.setState({ selectedDeliveryQualityId: quality.id })} style={{ display: "flex", justifyContent: "center" }} color="red">Muokkaa</Button>
                  </Table.Cell>
                </Table.Row>
              );
            })
          }
        </Table.Body>
      </Table>
    );
  }

  /**
   * Load delivery qualities
   */
  private loadDeliveryQualities = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ loading: true });
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQualities = await deliveryQualitiesService.listDeliveryQualities(undefined, undefined);
    this.setState({ deliveryQualities, loading: false });
  }

  /**
   * Renders category
   */
  private renderCategory = (itemGroupCategory: ItemGroupCategory) => {
    return itemGroupCategory === "FRESH" ? "TUORE" : "PAKASTE"; 
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

export default connect(mapStateToProps, mapDispatchToProps)(ManageQualities);
