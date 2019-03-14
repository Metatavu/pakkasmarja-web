import * as React from 'react';
import * as ReactDOM from 'react-dom';
import App from './components/App';
import Api from "pakkasmarja-client";

import registerServiceWorker from './registerServiceWorker';

import { createStore } from 'redux';
import { processAction } from './reducers/index';
import { StoreState } from './types/index';
import { AppAction } from './actions';
import { Provider } from 'react-redux';
const DEFAULT_API_PATH = "http://localhost:3000/rest/v1";

Api.configure(/*process.env.REACT_APP_API_BASE_PATH || */DEFAULT_API_PATH);

const store = createStore<StoreState, AppAction, any, any>(processAction, {
  authenticated: false
});

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
