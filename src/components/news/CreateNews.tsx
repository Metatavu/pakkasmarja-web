import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import BasicLayout from "../generic/BasicLayout";
import { Form, Button } from "semantic-ui-react";
import Api, { NewsArticle } from "pakkasmarja-client";
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Redirect } from "react-router";

/**
 * Interface to component props
 */
interface Props {
  keycloak?: Keycloak.KeycloakInstance;
}

/**
 * Interface to component state
 */
interface State {
  title: string,
  contents: string,
  imageUrl?: string,
  redirect: boolean
}

class CreateNews extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      title: "",
      contents: "",
      redirect: false
    };
  }

  /**
   * Handle form submit
   */
  private handleSubmit = async (e: React.SyntheticEvent) => {

    e.preventDefault();

    if (!this.props.keycloak || !this.props.keycloak.token ) {
      return;
    }
    const newsArticle: NewsArticle = { title: this.state.title, contents: this.state.contents, imageUrl: this.state.imageUrl };
    const newsService = await Api.getNewsArticlesService(this.props.keycloak.token);
    newsService.createNewsArticle(newsArticle).then(() => {
      this.setState({ redirect: true });
    });
  }

  render() {
    if (this.state.redirect) {
      return <Redirect to="/news" push={true} />;
    }
    return (
      <BasicLayout>
        <Form>
          <Form.Field required>
            <label>News title:</label>
            <input name="title" value={this.state.title} onChange={(e) => this.setState({ title: e.currentTarget.value })} />
          </Form.Field>
          <Form.Field>
            <label>Image URL:</label>
            <input name="imgUrl" value={this.state.imageUrl} onChange={(e) => this.setState({ imageUrl: e.currentTarget.value })} />
          </Form.Field>
          <Form.Field required>
            <label>Content:</label>
            <CKEditor
              editor={ClassicEditor}
              data={this.state.contents}
              onChange={(e: any, editor: any) => {
                const data = editor.getData();
                this.setState({ contents: data });
              }}
            />
          </Form.Field>
          <Button floated="right" color="red" style={{ marginTop: "10px" }} onClick={this.handleSubmit} type='submit'>Create</Button>
        </Form>
      </BasicLayout>
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

export default connect(mapStateToProps, mapDispatchToProps)(CreateNews);