import * as React from "react";
import * as actions from "../../actions/";
import { StoreState, DeliveriesState, Options, DeliveryDataValue } from "src/types";
import Api, { Product, ItemGroup } from "pakkasmarja-client";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import { Header, Dropdown, Form, Input, Button, Divider } from "semantic-ui-react";
import BasicLayout from "../generic/BasicLayout";
import { Redirect } from "react-router";
import "react-datepicker/dist/react-datepicker.css";
import { Link } from "react-router-dom";

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
  redirect: boolean,
  selectedItemGroupId: string,
  units: number,
  itemGroups: ItemGroup[],
  unitName: string,
  unitSize: number,
  name: string,
  sapItemCode: string
}

/**
 * Class component for create product 
 */
class CreateProduct extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      redirect: false,
      selectedItemGroupId: "",
      units: 0,
      itemGroups: [],
      unitName: "",
      unitSize: 0,
      name: "",
      sapItemCode: ""
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const itemGroupService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups: ItemGroup[] = await itemGroupService.listItemGroups();
    this.setState({ itemGroups });
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
   * Render drop down
   * 
   * @param options options
   * @param placeholder placeholder
   * @param key key
   */
  private renderDropDown = (options: Options[], placeholder: string, key: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }

    const value = this.state[key];
    return (
      <Dropdown
        selection
        fluid
        placeholder={placeholder}
        value={value}
        options={options}
        onChange={(event, data) => {
          this.handleInputChange(key, data.value)
        }
        }
      />
    );
  }

  /**
   * Handles product submit
   */
  private handleProductSubmit = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    
    const productService = await Api.getProductsService(this.props.keycloak.token);
    const product: Product = {
      itemGroupId: this.state.selectedItemGroupId,
      name: this.state.name,
      units: this.state.units,
      unitName: this.state.unitName,
      unitSize: this.state.unitSize,
      sapItemCode: this.state.sapItemCode
    }

    await productService.createProduct(product);
    this.setState({ redirect: true });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to='/productsManagement' />;
    }

    const itemGroupOptions: Options[] = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        text: itemGroup.name,
        value: itemGroup.id
      };
    });

    return (
      <BasicLayout>
        <Header as="h2">
          Uusi tuote
        </Header>
        <Form>
          <Form.Field>
            <label>Marjalaji</label>
            {this.renderDropDown(itemGroupOptions, "Valitse tuote", "selectedItemGroupId")}
          </Form.Field>
          <Form.Field>
            <label>Tuotteen nimi</label>
            <Input
              type="text"
              placeholder="Tuotteen nimi"
              value={this.state.name}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("name", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Yksikkönimi</label>
            <Input
              type="text"
              placeholder="Yksikkö nimi"
              value={this.state.unitName}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("unitName", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Yksikkömäärä</label>
            <Input
              min={0}
              type="number"
              value={this.state.units}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("units", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>Yksikkökoko</label>
            <Input
              min={0}
              type="number"
              value={this.state.unitSize}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("unitSize", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Form.Field>
            <label>SAP koodi</label>
            <Input
              type="text"
              value={this.state.sapItemCode}
              onChange={(event: React.SyntheticEvent<HTMLInputElement>) => {
                this.handleInputChange("sapItemCode", event.currentTarget.value)
              }}
            />
          </Form.Field>
          <Divider />
          <Button.Group floated="right" >
            <Button
              as={Link}
              to='/productsManagement'
              inverted
              color="red">Takaisin</Button>
            <Button.Or text="" />
            <Button color="red" disabled={ !this.isValid() } onClick={this.handleProductSubmit} type='submit'>Luo uusi tuote</Button>
          </Button.Group>
        </Form>
      </BasicLayout>
    );
  }

  /**
   * Returns whether form is valid or not
   * 
   * @return whether form is valid or not
   */
  private isValid = () => {
    return !!(this.state.selectedItemGroupId && this.state.name && this.state.units && this.state.unitSize && this.state.unitName && this.state.sapItemCode);
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
    keycloak: state.keycloak,
    deliveries: state.deliveries
  }
}

/**
 * Redux mapper for mapping component dispatches 
 * 
 * @param dispatch dispatch method
 */
export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
    deliveriesLoaded: (deliveries: DeliveriesState) => dispatch(actions.deliveriesLoaded(deliveries))
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateProduct);
