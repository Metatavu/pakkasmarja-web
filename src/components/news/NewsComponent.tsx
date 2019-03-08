import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
//import strings from "../../localization/strings";
import Api, { NewsArticle } from "pakkasmarja-client";
import "../../styles/common.scss";
import { Button, Item, Confirm } from "semantic-ui-react";
import { Link, Redirect } from "react-router-dom";
import Moment from 'react-moment';

/**
 * Interface for component State
 */
interface Props {
  data: NewsArticle;
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface for component State
 */
interface State {
  open?: boolean;
  redirect : boolean
}

class NewsComponent extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      redirect: false
    };
  }

  /**
   * Handle delete
   */
  private handleDelete = async () => {

    if (!this.props.keycloak || !this.props.keycloak.token || !this.props.data.id) {
      return;
    }

    const newsServices = await Api.getNewsArticlesService(this.props.keycloak.token);
    newsServices.deleteNewsArticle(this.props.data.id).then(()=>{
      this.setState({open:false,redirect : true});
    });
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to="/news" push={true} />;
    }
    return (
      <Item>
        <Item.Content as={Link} to={`watchNews/${this.props.data.id}`}>
        {
          this.props.data.title.length < 70 ?
          <Item.Header>{this.props.data.title}</Item.Header> 
          :
          <Item.Header>{this.props.data.title.replace(/(.{70})..+/, "$1...")}</Item.Header>
        }
          <Item.Description><Moment format="DD.MM.YYYY HH:mm">{this.props.data.createdAt}</Moment></Item.Description>
        </Item.Content>
        <Button.Group floated="right" style={{ maxHeight: "37px" }}>
          <Button as={Link} to={`editNews/${this.props.data.id}`} style={{ display: "flex", alignItems: "center" }} color="red">Edit</Button>
          <Button.Or text="" />
          <Button onClick={() => this.setState({ open: true })} color="black">Delete</Button>
        </Button.Group>
        <Confirm open={this.state.open} size={"mini"} content={"You sure you want to delete news: " + this.props.data.title} onCancel={() => this.setState({ open: false })} onConfirm={this.handleDelete} />
      </Item>
    );
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

export default connect(mapStateToProps, mapDispatchToProps)(NewsComponent);