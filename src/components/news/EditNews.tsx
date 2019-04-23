import * as React from "react";
import * as Keycloak from 'keycloak-js';
import * as actions from "../../actions/";
import { StoreState } from "src/types";
import { Dispatch } from "redux";
import { connect } from "react-redux";
import "../../styles/common.scss";
import BasicLayout from "../generic/BasicLayout";
import { Form, Button, Confirm, Image } from "semantic-ui-react";
import Api, { NewsArticle } from "pakkasmarja-client";
import CKEditor from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { Redirect } from "react-router";
import ImageGallery from "../generic/ImageGallery";
import UploadNewsImageModal from "./UploadNewsImageModal";
import { FileService } from "src/api/file.service";
import strings from "src/localization/strings";

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
  open?: boolean;
  news?: NewsArticle;
  title: string;
  contents: string;
  imageUrl?: string;
  redirect: boolean;
  galleryOpen: boolean;
  uploadModalOpen: boolean;
  imageBase64?: string;
}

class CreateNews extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      news: undefined,
      title: "",
      contents: "",
      redirect: false,
      galleryOpen: false,
      uploadModalOpen: false
    };
  }

  /**
   * Component did mount life-sycle event
   */
  async componentDidMount() {
    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
    const newArticleService = await Api.getNewsArticlesService(this.props.keycloak.token);
    newArticleService.findNewsArticle(this.props.match.params.newsId).then((newsArticle) => {
      const newsArticleObject: NewsArticle = newsArticle;
      this.onImageSelected(newsArticle.imageUrl || "");
      this.setState({ title: newsArticleObject.title, contents: newsArticleObject.contents, imageUrl: newsArticleObject.imageUrl });
    });

  }

  /**
   * Handle form submit
   * 
   * @param event event
   */
  private handleSubmit = async (event: React.SyntheticEvent) => {

    event.preventDefault();

    if (!this.props.keycloak || !this.props.keycloak.token) {
      return;
    }
   
    const newsArticle: NewsArticle = { title: this.state.title, contents: this.state.contents, imageUrl: this.state.imageUrl };
    const newsService = await Api.getNewsArticlesService(this.props.keycloak.token);
    newsService.updateNewsArticle(newsArticle, this.props.match.params.newsId).then(() => {
      this.setState({ redirect: true });
    });
  }

  /**
   * On image selected
   * 
   * @param url url
   */
  private onImageSelected = async (url: string) => {
    if (!this.props.keycloak || !this.props.keycloak.token || !process.env.REACT_APP_API_URL) {
      return;
    }
    
    const fileService = new FileService(process.env.REACT_APP_API_URL, this.props.keycloak.token);
    const imageData = await fileService.getFile(url);

    this.setState({ 
      imageBase64: `data:image/jpeg;base64,${imageData.data}`, 
      imageUrl: url,
      uploadModalOpen: false ,
      galleryOpen: false
    });
  }

  /**
   * Render method
   */
  public render() {
    if (this.state.redirect) {
      return <Redirect to="/news" push={true} />;
    }
    return (
      <BasicLayout>
        <Form>
          <Form.Field required>
            <label>{strings.title}</label>
            <input name="title" value={this.state.title} onChange={(e) => this.setState({ title: e.currentTarget.value })} placeholder='Title' />
          </Form.Field>
          <Form.Field>
            <label>{strings.image}</label>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ galleryOpen: true })}>
              {strings.openGallery}
            </Button>
            <Button color="red" style={{ marginTop: "10px" }} onClick={() => this.setState({ uploadModalOpen: true })}>
              {strings.uploadImage}
            </Button>
          </Form.Field>
          <Form.Field>
            {
              this.state.imageBase64 &&
                <div>
                  <Image src={this.state.imageBase64} size="medium" />
                  <p 
                    style={{color: "red", cursor: "pointer"}} 
                    onClick={() => this.setState({ imageBase64: undefined })}
                  >
                    {strings.deleteImage}
                  </p>
                </div>
            }
          </Form.Field>
          <Form.Field required>
            <label>{strings.content}:</label>
            <CKEditor
              editor={ClassicEditor}
              data={this.state.contents}
              onChange={(e: any, editor: any) => {
                const data = editor.getData();
                this.setState({ contents: data });
              }}
            />
          </Form.Field>
          <Button floated="right" color="red" style={{ marginTop: "10px" }} onClick={()=>this.setState({open:true})} type='submit'>{strings.save}</Button>
        </Form>
        <Confirm open={this.state.open} size={"mini"} content={"Haluatko varmasti muokata uutista?"} onCancel={() => this.setState({ open: false })} onConfirm={this.handleSubmit} />
        <ImageGallery 
          modalOpen={this.state.galleryOpen}
          onCloseModal={() => this.setState({ galleryOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url) }
        />
        <UploadNewsImageModal 
          modalOpen={this.state.uploadModalOpen}
          onCloseModal={() => this.setState({ uploadModalOpen: false })}
          onImageSelected={(url: string) => this.onImageSelected(url) }
        />
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