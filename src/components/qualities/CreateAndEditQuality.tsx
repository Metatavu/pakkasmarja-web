import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveryDataValue } from "src/types";
import Api, { DeliveryQuality, ItemGroupCategory, Product } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Header, Dropdown, Form, Input, Button, DropdownProps, Table, Icon } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from "react-router-dom";
import { ChromePicker } from 'react-color';
import * as _ from "lodash";
import AsyncButton from "../generic/asynchronous-button";

/**
 * Interface for component props
 */
interface Props {
  authenticated: boolean;
  keycloak?: Keycloak.KeycloakInstance;
  match?: any;
}

/**
 * Interface for component state
 */
interface State {
  redirect?: string,
  itemGroupCategory: ItemGroupCategory;
  displayName: string,
  name: string;
  priceBonus: number,
  color: string,
  deliveryQualityProductIds: string[],
  selectedDeliveryQualityId?: string,
  products: Product[]
}

/**
 * Class component for creating and editing delivery quality
 */
class CreateAndEditQuality extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      deliveryQualityProductIds: [],
      itemGroupCategory: "FRESH",
      displayName: "",
      name: "",
      priceBonus: 0,
      color: "#E50A0E",
      products: []
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    const selectedDeliveryQualityId = this.props.match.params.deliveryQualityId;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const products = await productsService.listProducts(undefined, undefined, undefined, undefined, 999);
    this.setState({ selectedDeliveryQualityId, products });

    if (selectedDeliveryQualityId !== "new") {
      this.loadDeliveryQuality(selectedDeliveryQualityId);
    }

  }

  /**
   * Loads delivery quality 
   */
  private loadDeliveryQuality = async (selectedDeliveryQualityId: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQuality = await deliveryQualitiesService.findDeliveryQuality(selectedDeliveryQualityId);
    if (!deliveryQuality) {
      throw new Error("Could not find delivery quality");
    }
    this.setState({
      deliveryQualityProductIds: deliveryQuality.deliveryQualityProductIds,
      itemGroupCategory: deliveryQuality.itemGroupCategory,
      displayName: deliveryQuality.displayName,
      name: deliveryQuality.name,
      priceBonus: deliveryQuality.priceBonus,
      color: deliveryQuality.color
    });

  }

  /**
   * Handle inputchange
   * 
   * @param key key
   * @param value value
   */
  private handleInputChange = (key: string, value: DeliveryDataValue) => {
    const state: State = this.state;
    state[key] = value;
    this.setState(state);
  }

  /**
  * Handle create click
  */
  private handleCreateClick = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }


    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQuality: DeliveryQuality = {
      itemGroupCategory: this.state.itemGroupCategory,
      displayName: this.state.displayName,
      name: this.state.name,
      priceBonus: this.state.priceBonus,
      color: this.state.color,
      deliveryQualityProductIds: this.state.deliveryQualityProductIds
    }
    await deliveryQualitiesService.createDeliveryQuality(deliveryQuality);
    this.setState({ redirect: "/manageQualities" });
  }

  /**
   * Handle update click
   */
  private handleUpdateClick = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.selectedDeliveryQualityId) {
      return;
    }

    const deliveryQualitiesService = await Api.getDeliveryQualitiesService(this.props.keycloak.token);
    const deliveryQuality: DeliveryQuality = {
      itemGroupCategory: this.state.itemGroupCategory,
      displayName: this.state.displayName,
      name: this.state.name,
      priceBonus: this.state.priceBonus,
      color: this.state.color,
      deliveryQualityProductIds: this.state.deliveryQualityProductIds
    }
    await deliveryQualitiesService.updateDeliveryQuality(deliveryQuality, this.state.selectedDeliveryQualityId);
    this.setState({ redirect: "/manageQualities" });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to={this.state.redirect} />;
    }

    return (
      <BasicLayout>
        <Header as="h2">
          {this.state.selectedDeliveryQualityId == "new" ? "Luo uusi laatu" : "Muokkaa laatua"}
        </Header>
        <Form>
          <Form.Field>
            <label>Kategoria</label>
            {this.renderDropDown()}
          </Form.Field>
          <Form.Field>
            <label>Näyttönimi (näkyvissä viljelijällä)</label>
            <Input
              type="text"
              placeholder="Näyttönimi"
              value={this.state.displayName}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("displayName", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Nimi (näkyvissä vastaanottajalla)</label>
            <Input
              type="text"
              placeholder="Nimi"
              value={this.state.name}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("name", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Hinta</label>
            <Input
              min={0}
              step={0.01}
              type="number"
              placeholder="Hinta"
              value={this.state.priceBonus}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("priceBonus", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            {this.renderProductList()}
          </Form.Field>
          <Form.Field>
            <ChromePicker color={this.state.color} disableAlpha={true} onChangeComplete={this.handleChangeComplete} />
          </Form.Field>
          <Button.Group floated="right" >
            <Button
              as={Link}
              to='/manageQualities'
              inverted
              color="red">Takaisin</Button>
            <Button.Or text="" />
            <AsyncButton color="red" disabled={!this.isValid()} onClick={ this.state.selectedDeliveryQualityId === "new" ? this.handleCreateClick : this.handleUpdateClick } type='submit'>
              {this.state.selectedDeliveryQualityId === "new" ? "Luo uusi laatu" : "Muokkaa laatua"}
            </AsyncButton>
          </Button.Group>
        </Form>
      </BasicLayout>
    );
  }

  /**
   * Render product list
   */
  private renderProductList = () => {
    return (
      <Table celled fixed unstackable>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell width={5} textAlign="center">
              Tuotteen nimi
            </Table.HeaderCell>
            <Table.HeaderCell width={3} textAlign="center">
              Yksikkönimi
              </Table.HeaderCell>
            <Table.HeaderCell width={3} textAlign="center">
              Yksikkömäärä
            </Table.HeaderCell>
            <Table.HeaderCell width={3} textAlign="center">
              Yksikkökoko
            </Table.HeaderCell>
            <Table.HeaderCell width={2} textAlign="center">
              Oikeus
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {
            _.sortBy(this.state.products, product => product.sapItemCode).map((product: Product) => {
              return (
                <Table.Row key={product.id}>
                  <Table.Cell textAlign="center">
                    {product.name}
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {product.unitName}
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {product.units}
                  </Table.Cell>
                  <Table.Cell textAlign="center">
                    {product.unitSize}
                  </Table.Cell>
                  <Table.Cell selectable className="permission-table-element" onClick={() => this.handlePermissionClick(product.id || "")} textAlign="center">
                    {product.id ? this.checkPermission(product.id) : null}
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
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(this.state.name 
      && this.state.color 
      && this.state.displayName 
      && this.state.itemGroupCategory);
  }

  /**
   * Handles permission click
   * @param productId
   */
  private handlePermissionClick = (productId: string) => {
    const deliveryQualityProductIds = [...this.state.deliveryQualityProductIds];
    if (deliveryQualityProductIds.includes(productId)) {
      deliveryQualityProductIds.splice(deliveryQualityProductIds.indexOf(productId), 1);
    } else {
      deliveryQualityProductIds.push(productId);
    }
    this.setState({ deliveryQualityProductIds });
  }

  /**
   * Check what permission quality has product
   * 
   * @param productId productId
   * @returns correct icon
   */
  private checkPermission = (productId: string) => {
    const deliveryQualityProductIds = this.state.deliveryQualityProductIds;
    const icon: JSX.Element = deliveryQualityProductIds.includes(productId) ? <Icon color='green' name='checkmark' size='large' /> : <Icon color='red' name='close' size='large' />;
    return icon;
  }

  /**
  * Renders drop down
  */
  private renderDropDown = () => {

    const options = [{
      key: "FRESH",
      value: "FRESH",
      text: "TUORE"
    }, {
      key: "FROZEN",
      value: "FROZEN",
      text: "PAKASTE"
    }]

    return (
      <Dropdown
        selection
        placeholder={this.state.itemGroupCategory}
        value={this.state.itemGroupCategory}
        options={options}
        onChange={(event: any, data: DropdownProps) =>
          this.setState({ itemGroupCategory: data.value as ItemGroupCategory })
        }
      />
    );
  }

  /**
   * Handle color change complete
   */
  private handleChangeComplete = (color: any) => {
    this.setState({ color: color.hex });
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateAndEditQuality);
