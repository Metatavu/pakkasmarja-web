import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState, Options, DeliveryDataValue } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.css";
import BasicLayout from "../generic/BasicLayout";
import { Form, Button, Header, Input, Divider, Dropdown, Dimmer, Loader } from "semantic-ui-react";
import Api, { Product, ItemGroup } from "pakkasmarja-client";
import { Redirect } from "react-router";
import { Link } from "react-router-dom";

/**
 * Interface to component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
  match?: any
}

/**
 * Interface to component state
 */
interface State {
  open?: boolean,
  productId: string,
  redirect: boolean,
  selectedItemGroupId: string,
  units: number,
  itemGroups: ItemGroup[],
  unitName: string,
  unitSize: number,
  name: string,
  productLoading: boolean,
  title: string,
  sapItemCode: string,
}

/**
 * Class component for products list
 */
class EditProduct extends React.Component<Props, State> {

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
      productId: "",
      productLoading: false,
      title: "",
      sapItemCode: ""
    };
  }

  /**
   * Component did mount life-sycle event
   */
  public async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    this.setState({ productLoading: true });
    const productId: string = this.props.match.params.productId;
    const productsService = await Api.getProductsService(this.props.keycloak.token);
    const product: Product = await productsService.findProduct(productId);
    const itemGroupService = await Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroups: ItemGroup[] = await itemGroupService.listItemGroups();
    this.setState({
      productId: product.id || "",
      name: product.name,
      selectedItemGroupId: product.itemGroupId,
      units: product.units,
      unitName: product.unitName,
      unitSize: product.unitSize,
      itemGroups,
      title : product.name,
      sapItemCode: product.sapItemCode
    });

    this.setState({ productLoading: false });
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
   * Handle update product
   * 
   */
  private handleUpdateProduct = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token || !this.state.productId) {
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

    await productService.updateProduct(product, this.state.productId);
    this.setState({ redirect: true });
  }



  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to='/productsManagement' />;
    }

    if (this.state.productLoading) {
      return (
        <BasicLayout>
          <Dimmer active inverted>
            <Loader inverted>
              Ladataan tuotetta
            </Loader>
          </Dimmer>
        </BasicLayout>
      );
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
          Muokkaa tuotetta {this.state.title}
        </Header>
        <Form>
          <Form.Field>
            <label>Marjalaji</label>
            {this.renderDropDown(itemGroupOptions, "Valitse tuote", "selectedItemGroupId")}
          </Form.Field>
          <Form.Field>
            <label>Tuotteennimi</label>
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
              step={0.01}
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
            <Button color="red" disabled={ !this.isValid() } onClick={this.handleUpdateProduct} type='submit'>Tallenna muutokset</Button>
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

export function mapStateToProps(state: StoreState) {
  return {
    keycloak: state.keycloak
  }
}

export function mapDispatchToProps(dispatch: Dispatch<actions.AppAction>) {
  return {
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditProduct);
