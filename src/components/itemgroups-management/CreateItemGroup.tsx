import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions";
import { StoreState, Options } from "../../types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import { Header, Button, Input, Form, Dropdown, Modal } from "semantic-ui-react";
import Api, { ItemGroup } from "pakkasmarja-client";
import { Redirect } from "react-router";
import BasicLayout from "../generic/BasicLayout";

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
  name: string;
  displayName: string;
  category: "FRESH" | "FROZEN";
  prerequisiteContractItemGroupId: string;
  minimumProfitEstimation: number;
  itemGroups: ItemGroup[];
  redirect: boolean;
  loading: boolean;
  modalOpen: boolean;
  modalText: string;
};

/**
 * Class for create item groups
 */
class CreateItemGroup extends React.Component<Props, State> {

  /**
   * Constructor
   * 
   * @param props props
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      name: "",
      displayName: "",
      category: "FRESH",
      prerequisiteContractItemGroupId: "",
      minimumProfitEstimation: 0,
      itemGroups: [],
      redirect: false,
      loading: false,
      modalOpen: false,
      modalText: ""
    };
  }

  /**
   * Component did mount life-cycle event
   */
  public componentDidMount = async () => {
    this.setState({ loading: true });
    await this.loadItemGroups();
    this.setState({ loading: false });
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
   * Render text input
   * 
   * @param value value
   * @param onChange on change function
   * @param placeholder placeholder
   * @param disabled disabled
   */
  private renderTextInput = (value: string | number, onChange: (value: string) => void, placeholder: string, disabled: boolean) => {
    return (
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event: React.FormEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
        disabled={disabled}
      />
    );
  }

  /**
   * Handle item group change
   * 
   * @param value value
   */
  private handeCategoryChange = (value: "FRESH" | "FROZEN") => {
    this.setState({ category: value });
  }

  /**
   * Handle item group change
   * 
   * @param value value
   */
  private handePrerequisiteContractItemGroupIdChange = (value: string) => {
    this.setState({ prerequisiteContractItemGroupId: value });
  }

  /**
   * Handle create click
   */
  private handleCreateClick = async () => {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }

    if (!this.state.name || !this.state.category || !this.state.minimumProfitEstimation) {
      this.setState({
        modalText: "Vaadittuja kenttiä ovat nimi, kategoria ja minimi voittoarvio",
        modalOpen: true
      });
    }

    const itemGroupsService = Api.getItemGroupsService(this.props.keycloak.token);
    const itemGroup: ItemGroup = {
      name: this.state.name,
      displayName: this.state.displayName,
      category: this.state.category,
      prerequisiteContractItemGroupId: this.state.prerequisiteContractItemGroupId,
      minimumProfitEstimation: this.state.minimumProfitEstimation
    };

    await itemGroupsService.createItemGroup(itemGroup);
    this.setState({ redirect: true });
  }

  /**
   * Render drop down
   * 
   * @param options options
   * @param value value
   * @param onChange onChange function
   * @param placeholder placeholder
   */
  private renderDropDown = (options: Options[], value: string | number, onChange: (value: string) => void, placeholder: string) => {
    if (options.length <= 0) {
      return <Dropdown fluid />;
    }

    return (
      <Dropdown
        fluid
        placeholder={placeholder}
        selection
        value={value}
        options={options}
        onChange={(event, data) => {
          onChange(data.value as string)
        }
        }
      />
    );
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return (
        <Redirect to="itemGroupsManagement" />
      );
    }

    const categoryOptions = [{
      value: "FRESH", text: "Tuore"
    }, {
      value: "FROZEN", text: "Pakaste"
    }].map((category) => {
      return {
        key: category.value,
        text: category.text,
        value: category.value
      };
    });

    const defaultItemGroupOptions: Options[] = [{
      key: "default",
      value: undefined,
      text: "Ei vaadi sopimusta"
    }];

    const itemGroupOptions: Options[] = this.state.itemGroups.map((itemGroup) => {
      return {
        key: itemGroup.id,
        value: itemGroup.id,
        text: itemGroup.name
      };
    });

    return (
      <BasicLayout>
        <Header as="h3">
          Uusi marjalaji
        </Header>
        <Form>
          <Form.Field>
            <label>Nimi</label>
            {this.renderTextInput(this.state.name, (value: string) => this.setState({ name: value }), "Nimi", false)}
          </Form.Field>
          <Form.Field>
            <label>Julkinen nimi</label>
            {this.renderTextInput(this.state.displayName, (value: string) => this.setState({ displayName: value }), "Julkinen nimi", false)}
          </Form.Field>
          <Form.Field>
            <label>Kategoria</label>
            {this.renderDropDown(categoryOptions, this.state.category, this.handeCategoryChange, "Valitse kategoria ")}
          </Form.Field>
          <Form.Field>
            <label>Vaatii sopimuksen tuoteryhmässä</label>
            {this.renderDropDown(defaultItemGroupOptions.concat(itemGroupOptions), this.state.prerequisiteContractItemGroupId, this.handePrerequisiteContractItemGroupIdChange, "Valitse tuoteryhmä ")}
          </Form.Field>
          <Form.Field>
            <label>Minimi voittoarvio</label>
            {this.renderTextInput(this.state.minimumProfitEstimation, (value: string) => this.setState({ minimumProfitEstimation: value ? parseInt(value) : 0 }), "Minimi voittoarvio", false)}
          </Form.Field>
        </Form>
        <Button.Group floated="right" className="modal-button-group" >
          <Button onClick={() => {this.setState({ redirect: true })}} color="black">Peruuta</Button>
          <Button.Or text="" />
          <Button onClick={this.handleCreateClick} color="red">Lisää marjalaji</Button>
        </Button.Group>
        <Modal size="small" open={this.state.modalOpen} onClose={() => this.setState({ modalOpen: false })} closeIcon>
          <Modal.Content>{ this.state.modalText }</Modal.Content>
        </Modal>
      </BasicLayout>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateItemGroup);
